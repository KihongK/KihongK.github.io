---
permalink: /assets/js/chatbot-setup.js
---
// 채팅봇 전용 스크립트 파일
// AI 자기소개 챗봇의 모든 기능을 담당
// Socket.IO 실시간 통신 + REST API 폴백 지원

// 전역 변수
const API_BASE_URL = 'https://api.kim-ki-hong.com';

let socket = null;
let isSocketConnected = false;
let isTyping = false;
let lastResponseTime = 0;
let isConnected = false;
let messageStartTime = 0;
let humanJoinNotified = false;
let visitorInfo = null;

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', function() {
  if (!document.getElementById('chat-container') && !document.getElementById('welcome-screen')) {
    return;
  }

  // 방문자 정보 로드
  loadVisitorInfo();

  // 입력 필드 실시간 저장 설정
  setupVisitorInfoAutoSave();

  const hasHistory = loadChatHistory();
  setupInputHandlers();

  // Socket.IO 연결 시도
  initSocketConnection();

  // 방문자 정보가 없고 채팅 기록도 없으면 정보 입력 폼 표시
  if (!visitorInfo && !hasHistory) {
    showUserInfoForm();
  } else if (hasHistory) {
    showChatView();
  }

  if (!isConnected) {
    setChatBlur(true);
    enableChatInput(false);
  }

  // 부트스트랩 툴팁 초기화
  if (typeof bootstrap !== 'undefined') {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  setTimeout(() => {
    const userInput = document.getElementById('user-input');
    if (userInput) {
      userInput.focus();
    }
  }, 500);
});

// Socket.IO 연결 초기화
function initSocketConnection() {
  if (typeof io === 'undefined') {
    console.warn('Socket.IO not loaded, falling back to REST API');
    checkConnectionStatusREST();
    return;
  }

  // 기존 연결이 있으면 먼저 종료
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // auth 정보 준비 (visitorInfo가 없으면 랜덤 이름 생성)
  const authInfo = {
    user_name: visitorInfo?.name || generateRandomUsername(),
    company_name: visitorInfo?.company || ''
  };

  try {
    socket = io(API_BASE_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      auth: authInfo
    });

    // 연결 성공
    socket.on('connect', () => {
      console.log('Socket.IO connected');
      isSocketConnected = true;
      setConnectionStatus(true, 'socket');
    });

    // 연결 해제
    socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      isSocketConnected = false;
      setConnectionStatus(false);
    });

    // 연결 오류
    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      isSocketConnected = false;
      // REST API로 폴백
      checkConnectionStatusREST();
    });

    // 응답 수신
    socket.on('chat:response', (data) => {
      handleChatResponse(data);
    });

    // 타이핑 상태 수신
    socket.on('chat:typing', (data) => {
      handleTypingStatus(data);
    });

    // 담당자 참여 알림 (한 번만 표시)
    socket.on('chat:human_join', () => {
      if (!humanJoinNotified) {
        humanJoinNotified = true;
        displaySystemMessage('담당자가 대화에 참여했습니다', 'human_join');
      }
    });

  } catch (error) {
    console.error('Socket.IO initialization failed:', error);
    checkConnectionStatusREST();
  }
}

// 응답 처리
function handleChatResponse(data) {
  hideTyping();

  const { response, source, timestamp } = data;
  const sender = source === 'human' ? 'human' : 'bot';

  displayMessage(response, sender);

  if (messageStartTime > 0) {
    lastResponseTime = Date.now() - messageStartTime;
    updateResponseTime();
    messageStartTime = 0;
  }

  setLoadingState(false);
}

// 타이핑 상태 처리
function handleTypingStatus(data) {
  if (data.is_typing) {
    showTyping();
  } else {
    hideTyping();
  }
}

// 시스템 메시지 표시 (담당자 참여 등)
function displaySystemMessage(message, type) {
  const messagesDiv = document.getElementById('messages');
  if (!messagesDiv) return;

  showChatView();

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message system message-enter';

  if (type === 'human_join') {
    messageDiv.innerHTML = `
      <div class="d-flex justify-content-center mb-3">
        <div class="system-notification human-join-notification">
          <i class="fas fa-user-check me-2"></i>
          ${escapeHtml(message)}
        </div>
      </div>
    `;
  }

  messagesDiv.appendChild(messageDiv);
  scrollToBottom();
}

// 웰컴 스크린 숨기고 채팅 화면 표시
function showChatView() {
  const userInfoForm = document.getElementById('user-info-form');
  const welcomeScreen = document.getElementById('welcome-screen');
  const chatContainer = document.getElementById('chat-container');

  if (userInfoForm) {
    userInfoForm.style.display = 'none';
  }
  if (welcomeScreen) {
    welcomeScreen.style.display = 'none';
  }
  if (chatContainer) {
    chatContainer.style.display = 'block';
  }
}

// 방문자 정보 폼 표시
function showUserInfoForm() {
  const userInfoForm = document.getElementById('user-info-form');
  const welcomeScreen = document.getElementById('welcome-screen');
  const chatContainer = document.getElementById('chat-container');

  if (userInfoForm) {
    userInfoForm.style.display = 'flex';
  }
  if (welcomeScreen) {
    welcomeScreen.style.display = 'none';
  }
  if (chatContainer) {
    chatContainer.style.display = 'none';
  }
}

// 웰컴 스크린 표시 (정보 입력 후)
function showWelcomeScreen() {
  const userInfoForm = document.getElementById('user-info-form');
  const welcomeScreen = document.getElementById('welcome-screen');
  const chatContainer = document.getElementById('chat-container');

  if (userInfoForm) {
    userInfoForm.style.display = 'none';
  }
  if (welcomeScreen) {
    welcomeScreen.style.display = 'flex';
  }
  if (chatContainer) {
    chatContainer.style.display = 'none';
  }
}

// 방문자 정보 로드 (sessionStorage - 새로고침 시 초기화)
function loadVisitorInfo() {
  const saved = sessionStorage.getItem('visitorInfo');
  if (saved) {
    visitorInfo = JSON.parse(saved);
    // 폼 필드에 저장된 값 복원
    restoreVisitorInfoToForm();
  }
}

// 폼 필드에 방문자 정보 복원
function restoreVisitorInfoToForm() {
  const nameInput = document.getElementById('visitor-name');
  const companyInput = document.getElementById('visitor-company');

  // 먼저 저장된 방문자 정보에서 복원
  if (visitorInfo) {
    if (nameInput && visitorInfo.name) {
      nameInput.value = visitorInfo.name;
    }
    if (companyInput && visitorInfo.company) {
      companyInput.value = visitorInfo.company;
    }
  }

  // 임시 저장된 입력값이 있으면 덮어쓰기 (입력 중 새로고침 대비)
  const tempName = sessionStorage.getItem('visitorNameTemp');
  const tempCompany = sessionStorage.getItem('visitorCompanyTemp');

  if (nameInput && tempName !== null) {
    nameInput.value = tempName;
  }
  if (companyInput && tempCompany !== null) {
    companyInput.value = tempCompany;
  }
}

// 입력 필드 실시간 저장 설정
function setupVisitorInfoAutoSave() {
  const nameInput = document.getElementById('visitor-name');
  const companyInput = document.getElementById('visitor-company');

  if (nameInput) {
    nameInput.addEventListener('input', function() {
      sessionStorage.setItem('visitorNameTemp', this.value);
    });
  }
  if (companyInput) {
    companyInput.addEventListener('input', function() {
      sessionStorage.setItem('visitorCompanyTemp', this.value);
    });
  }
}

// 임시 저장 데이터 삭제 (정보 제출 후)
function clearVisitorInfoTemp() {
  sessionStorage.removeItem('visitorNameTemp');
  sessionStorage.removeItem('visitorCompanyTemp');
}

// 랜덤 사용자 이름 생성
function generateRandomUsername() {
  const randomNum = Math.floor(10000000 + Math.random() * 90000000);
  return `User_${randomNum}`;
}

// 방문자 정보 저장 (sessionStorage - 새로고침 시 초기화)
function saveVisitorInfo(name, company) {
  visitorInfo = {
    name: name || generateRandomUsername(),
    company: company || '',
    timestamp: new Date().toISOString()
  };
  sessionStorage.setItem('visitorInfo', JSON.stringify(visitorInfo));
}

// 방문자 정보 제출
function submitUserInfo() {
  const nameInput = document.getElementById('visitor-name');
  const companyInput = document.getElementById('visitor-company');

  const name = nameInput ? nameInput.value.trim() : '';
  const company = companyInput ? companyInput.value.trim() : '';

  saveVisitorInfo(name, company);
  clearVisitorInfoTemp();

  // 새 방문자 정보로 소켓 재연결
  initSocketConnection();

  showWelcomeScreen();

  // 포커스를 입력창으로 이동
  setTimeout(() => {
    const userInput = document.getElementById('user-input');
    if (userInput) {
      userInput.focus();
    }
  }, 300);
}

// 방문자 정보 건너뛰기
function skipUserInfo() {
  saveVisitorInfo('', '');
  clearVisitorInfoTemp();

  // 랜덤 이름으로 소켓 재연결
  initSocketConnection();

  showWelcomeScreen();

  setTimeout(() => {
    const userInput = document.getElementById('user-input');
    if (userInput) {
      userInput.focus();
    }
  }, 300);
}

// 빠른 질문 클릭 핸들러
function askQuestion(question) {
  const userInput = document.getElementById('user-input');
  if (userInput) {
    userInput.value = question;
    showChatView();
    sendMessage();
  }
}

// 입력 핸들러 설정
function setupInputHandlers() {
  const userInput = document.getElementById('user-input');
  const charCount = document.getElementById('charCount');
  const sendBtn = document.getElementById('sendBtn');

  if (!userInput || !charCount || !sendBtn) return;

  userInput.addEventListener('input', function() {
    const length = this.value.length;
    charCount.textContent = length;

    sendBtn.disabled = length === 0 || isTyping;

    if (length > 450) {
      charCount.style.color = 'var(--global-danger-block)';
    } else if (length > 400) {
      charCount.style.color = 'var(--global-warning-block)';
    } else {
      charCount.style.color = 'var(--global-text-color-light)';
    }
  });
}

// Enter 키 처리
function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

// 메시지 전송
async function sendMessage() {
  const userInput = document.getElementById('user-input');
  const message = userInput.value.trim();

  if (!message || isTyping) return;

  if (!isConnected) {
    displayMessage('현재 서버에 연결할 수 없습니다. 연결 상태를 확인해주세요.', 'error');
    return;
  }

  displayMessage(message, 'user');
  userInput.value = '';
  document.getElementById('charCount').textContent = '0';

  setLoadingState(true);
  messageStartTime = Date.now();

  // Socket.IO 연결이 있으면 소켓으로 전송 (auth로 이미 사용자 정보 전달됨)
  if (isSocketConnected && socket) {
    socket.emit('chat:message', { message: message });
    // 타이핑 인디케이터는 서버에서 chat:typing 이벤트로 제어
  } else {
    // REST API 폴백
    await sendMessageREST(message);
  }
}

// REST API로 메시지 전송 (폴백)
async function sendMessageREST(message) {
  showTyping();

  try {
    const payload = { message: message };
    if (visitorInfo) {
      payload.visitor_name = visitorInfo.name || '';
      payload.visitor_company = visitorInfo.company || '';
    }

    const response = await fetch(`${API_BASE_URL}/v1/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    lastResponseTime = Date.now() - messageStartTime;

    hideTyping();
    displayMessage(data.response, 'bot', data.question_type);

    if (data.suggested_questions) {
      showSuggestedQuestions(data.suggested_questions);
    }

    updateResponseTime();
    setConnectionStatus(true, 'rest');

  } catch (error) {
    console.error('API 요청 실패:', error);
    hideTyping();
    displayMessage('죄송합니다. 현재 서비스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.', 'error');
    setConnectionStatus(false);
  } finally {
    setLoadingState(false);
    messageStartTime = 0;
  }
}

// 메시지 표시
function displayMessage(message, sender, questionType = null) {
  const messagesDiv = document.getElementById('messages');
  if (!messagesDiv) return;

  showChatView();

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender} message-enter`;

  const timestamp = new Date().toLocaleTimeString();

  if (sender === 'user') {
    messageDiv.innerHTML = `
      <div class="d-flex justify-content-end mb-3">
        <div class="chat-message user-message">
          <div class="message-content">${escapeHtml(message)}</div>
          <div class="message-time">${timestamp}</div>
        </div>
      </div>
    `;
  } else if (sender === 'bot') {
    const typeIcon = getQuestionTypeIcon(questionType);
    messageDiv.innerHTML = `
      <div class="d-flex justify-content-start align-items-start gap-2 mb-3">
        <div class="message-avatar bot-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="chat-message bot-message">
          ${typeIcon ? `<div class="message-type-badge">${typeIcon}</div>` : ''}
          <div class="message-content">${formatBotMessage(message)}</div>
          <div class="message-time">${timestamp}</div>
        </div>
      </div>
    `;
  } else if (sender === 'human') {
    // 담당자(개발자) 응답 - 다른 스타일
    messageDiv.innerHTML = `
      <div class="d-flex justify-content-start align-items-start gap-2 mb-3">
        <div class="message-avatar human-avatar">
          <i class="fas fa-user-tie"></i>
        </div>
        <div class="chat-message human-message">
          <div class="message-source-badge">
            <i class="fas fa-headset me-1"></i>담당자
          </div>
          <div class="message-content">${formatBotMessage(message)}</div>
          <div class="message-time">${timestamp}</div>
        </div>
      </div>
    `;
  } else if (sender === 'error') {
    messageDiv.innerHTML = `
      <div class="d-flex justify-content-center mb-3">
        <div class="chat-message error-message">
          <div class="message-content">
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${escapeHtml(message)}
          </div>
        </div>
      </div>
    `;
  }

  messagesDiv.appendChild(messageDiv);
  scrollToBottom();

  saveConversation(message, sender, questionType);
}

// 타이핑 인디케이터 표시
function showTyping() {
  if (isTyping) return; // 이미 표시 중이면 무시

  isTyping = true;
  const messagesDiv = document.getElementById('messages');
  if (!messagesDiv) return;

  const typingDiv = document.createElement('div');
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <div class="d-flex justify-content-start align-items-start gap-2 mb-3">
      <div class="message-avatar bot-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="chat-message bot-message">
        <span class="typing-dots">
          <span></span><span></span><span></span>
        </span>
      </div>
    </div>
  `;
  messagesDiv.appendChild(typingDiv);
  scrollToBottom();
}

// 타이핑 인디케이터 숨김
function hideTyping() {
  isTyping = false;
  const typingDiv = document.getElementById('typing-indicator');
  if (typingDiv) {
    typingDiv.remove();
  }
}

// 후속 질문 제안 표시
function showSuggestedQuestions(questions) {
  const suggestionsContainer = document.getElementById('questionSuggestions');
  const suggestedQuestionsDiv = document.getElementById('suggestedQuestions');

  if (!suggestionsContainer || !suggestedQuestionsDiv) return;

  suggestionsContainer.innerHTML = '';

  questions.forEach(question => {
    const btn = document.createElement('button');
    btn.className = 'btn suggestion-btn';
    btn.textContent = question;
    btn.onclick = () => {
      const userInput = document.getElementById('user-input');
      if (userInput) {
        userInput.value = question;
        suggestedQuestionsDiv.style.display = 'none';
        sendMessage();
      }
    };
    suggestionsContainer.appendChild(btn);
  });

  suggestedQuestionsDiv.style.display = 'block';
}

// 대화 히스토리 관련 함수들
function saveConversation(message, sender, questionType = null) {
  let conversations = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  conversations.push({
    message: message,
    sender: sender,
    questionType: questionType,
    timestamp: new Date().toISOString()
  });

  if (conversations.length > 100) {
    conversations = conversations.slice(-100);
  }

  localStorage.setItem('chatHistory', JSON.stringify(conversations));
}

function loadChatHistory() {
  const conversations = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  if (conversations.length === 0) {
    return false;
  }

  conversations.forEach(conv => {
    if (conv.sender !== 'system') {
      const messagesDiv = document.getElementById('messages');
      if (!messagesDiv) return;

      showChatView();

      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${conv.sender}`;

      const timestamp = conv.timestamp ? new Date(conv.timestamp).toLocaleTimeString() : '';

      if (conv.sender === 'user') {
        messageDiv.innerHTML = `
          <div class="d-flex justify-content-end mb-3">
            <div class="chat-message user-message">
              <div class="message-content">${escapeHtml(conv.message)}</div>
              ${timestamp ? `<div class="message-time">${timestamp}</div>` : ''}
            </div>
          </div>
        `;
      } else if (conv.sender === 'bot') {
        const typeIcon = getQuestionTypeIcon(conv.questionType);
        messageDiv.innerHTML = `
          <div class="d-flex justify-content-start align-items-start gap-2 mb-3">
            <div class="message-avatar bot-avatar">
              <i class="fas fa-robot"></i>
            </div>
            <div class="chat-message bot-message">
              ${typeIcon ? `<div class="message-type-badge">${typeIcon}</div>` : ''}
              <div class="message-content">${formatBotMessage(conv.message)}</div>
              ${timestamp ? `<div class="message-time">${timestamp}</div>` : ''}
            </div>
          </div>
        `;
      } else if (conv.sender === 'human') {
        messageDiv.innerHTML = `
          <div class="d-flex justify-content-start align-items-start gap-2 mb-3">
            <div class="message-avatar human-avatar">
              <i class="fas fa-user-tie"></i>
            </div>
            <div class="chat-message human-message">
              <div class="message-source-badge">
                <i class="fas fa-headset me-1"></i>담당자
              </div>
              <div class="message-content">${formatBotMessage(conv.message)}</div>
              ${timestamp ? `<div class="message-time">${timestamp}</div>` : ''}
            </div>
          </div>
        `;
      }

      messagesDiv.appendChild(messageDiv);
    }
  });

  scrollToBottom();
  return true;
}

function clearChat() {
  if (confirm('대화를 모두 삭제하시겠습니까?')) {
    const messagesDiv = document.getElementById('messages');
    const suggestedQuestionsDiv = document.getElementById('suggestedQuestions');
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatContainer = document.getElementById('chat-container');

    if (messagesDiv) {
      messagesDiv.innerHTML = '';
    }

    localStorage.removeItem('chatHistory');
    humanJoinNotified = false;

    if (suggestedQuestionsDiv) {
      suggestedQuestionsDiv.style.display = 'none';
    }

    if (welcomeScreen) {
      welcomeScreen.style.display = 'flex';
    }
    if (chatContainer) {
      chatContainer.style.display = 'none';
    }
  }
}

// 유틸리티 함수들
function setLoadingState(loading) {
  const sendBtn = document.getElementById('sendBtn');
  const sendBtnText = document.getElementById('sendBtnText');
  const sendBtnLoading = document.getElementById('sendBtnLoading');
  const userInput = document.getElementById('user-input');

  if (!sendBtn || !sendBtnText || !sendBtnLoading || !userInput) return;

  sendBtn.disabled = loading || isTyping;
  userInput.disabled = loading;

  if (loading) {
    sendBtnText.style.display = 'none';
    sendBtnLoading.style.display = 'inline';
  } else {
    sendBtnText.style.display = 'inline';
    sendBtnLoading.style.display = 'none';
  }
}

function scrollToBottom() {
  const chatContainer = document.getElementById('chat-container');
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatBotMessage(message) {
  return message
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function getQuestionTypeIcon(questionType) {
  const icons = {
    'project': '💼 프로젝트',
    'technical': '⚡ 기술',
    'personal': '🙂 인성',
    'experience': '📚 경험'
  };
  return icons[questionType] || null;
}

function setConnectionStatus(connected, type = null) {
  const status = document.getElementById('connectionStatus');
  if (!status) return;

  isConnected = connected;

  if (connected) {
    const connectionType = type === 'socket' ? '실시간' : '연결됨';
    const icon = type === 'socket' ? 'fa-bolt' : 'fa-circle';
    status.innerHTML = `<i class="fas ${icon}"></i><span>${connectionType}</span>`;
    status.className = 'connection-badge';

    setChatBlur(false);
    enableChatInput(true);
  } else {
    status.innerHTML = '<i class="fas fa-circle"></i><span>연결 오류</span>';
    status.className = 'connection-badge offline';

    setChatBlur(true);
    enableChatInput(false);
  }
}

function updateResponseTime() {
  if (lastResponseTime > 0) {
    const responseTimeElement = document.getElementById('responseTime');
    if (responseTimeElement) {
      responseTimeElement.innerHTML = `
        <i class="fas fa-tachometer-alt me-1"></i>응답시간: ${lastResponseTime}ms
      `;
    }
  }
}

// REST API 연결 상태 확인 (폴백용)
async function checkConnectionStatusREST() {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/health/`, { method: 'GET' });
    setConnectionStatus(response.ok, 'rest');
  } catch (error) {
    setConnectionStatus(false);
  }
}

// 채팅창 흐림 효과 제어
function setChatBlur(blur) {
  const chatContainer = document.getElementById('chat-container');
  const welcomeScreen = document.getElementById('welcome-screen');
  const chatbotMain = document.querySelector('.chatbot-main');

  const targets = [chatContainer, welcomeScreen, chatbotMain].filter(Boolean);

  targets.forEach(el => {
    if (blur) {
      el.style.filter = 'blur(2px)';
      el.style.opacity = '0.6';
      el.style.pointerEvents = 'none';
    } else {
      el.style.filter = 'none';
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    }
  });
}

// 채팅 입력 필드 활성화/비활성화
function enableChatInput(enable) {
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('sendBtn');
  const charCount = document.getElementById('charCount');
  const inputContainer = document.querySelector('.chatbot-input-container');

  if (userInput) {
    userInput.disabled = !enable;
    userInput.placeholder = enable ? '메시지를 입력하세요...' : '서버 연결 오류로 메시지를 보낼 수 없습니다';
  }

  if (sendBtn) {
    sendBtn.disabled = !enable;
  }

  if (charCount) {
    charCount.style.color = enable ? '' : '#ff6b6b';
  }

  if (inputContainer) {
    inputContainer.style.opacity = enable ? '1' : '0.5';
  }
}

// Socket.IO 연결이 없을 때만 주기적으로 REST 상태 확인
setInterval(() => {
  if (!isSocketConnected) {
    checkConnectionStatusREST();
  }
}, 30000);
