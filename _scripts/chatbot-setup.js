---
permalink: /assets/js/chatbot-setup.js
---
// 채팅봇 전용 스크립트 파일
// AI 자기소개 챗봇의 모든 기능을 담당

// 전역 변수
// const API_BASE_URL = 'http://127.0.0.1:8888'; // 실제 도메인으로 변경 필요
const API_BASE_URL = 'https://kihongk.duckdns.org:9000'; // 실제 도메인으로 변경 필요
// const API_BASE_URL = 'https://b12b69e78c72.ngrok-free.app'; // 실제 도메인으로 변경 필요

let isTyping = false;
let lastResponseTime = 0;
let isConnected = false; // 연결 상태 추적

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', function() {
  // 채팅봇 요소가 존재하는지 확인
  if (!document.getElementById('chat-container')) {
    return; // 채팅봇이 없는 페이지에서는 실행하지 않음
  }
  
  loadChatHistory();
  setupInputHandlers();
  checkConnectionStatus();
  
  // 초기 연결 상태에 따른 UI 설정
  if (!isConnected) {
    setChatBlur(true);
    enableChatInput(false);
  }
  
  // 부트스트랩 툴팁 초기화
  if (typeof bootstrap !== 'undefined') {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }
  
  // 입력 필드에 포커스
  setTimeout(() => {
    const userInput = document.getElementById('user-input');
    if (userInput) {
      userInput.focus();
    }
  }, 500);
});

// 입력 핸들러 설정
function setupInputHandlers() {
  const userInput = document.getElementById('user-input');
  const charCount = document.getElementById('charCount');
  const sendBtn = document.getElementById('sendBtn');
  
  if (!userInput || !charCount || !sendBtn) return;
  
  userInput.addEventListener('input', function() {
    const length = this.value.length;
    charCount.textContent = length;
    
    // 전송 버튼 활성화/비활성화
    sendBtn.disabled = length === 0 || isTyping;
    
    // 문자 수 색상 변경
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
  
  // 연결 상태 확인 - 연결이 안 되면 메시지 전송 불가
  if (!isConnected) {
    displayMessage('현재 서버에 연결할 수 없습니다. 연결 상태를 확인해주세요.', 'error');
    return;
  }
  
  // 사용자 메시지 표시
  displayMessage(message, 'user');
  userInput.value = '';
  document.getElementById('charCount').textContent = '0';
  
  // 전송 버튼 비활성화 및 로딩 표시
  setLoadingState(true);
  
  // 타이핑 인디케이터 표시
  showTyping();
  
  const startTime = Date.now();
  
  try {
    // API 서버가 없을 때를 위한 임시 응답 생성
    if (API_BASE_URL === 'https://your-domain.duckdns.org:8000') {
      // 임시 응답 생성 (테스트용)
      setTimeout(() => {
        hideTyping();
        const mockResponse = generateMockResponse(message);
        displayMessage(mockResponse.response, 'bot', mockResponse.question_type);
        
        if (mockResponse.suggested_questions) {
          showSuggestedQuestions(mockResponse.suggested_questions);
        }
        
        lastResponseTime = Date.now() - startTime;
        updateResponseTime();
        setConnectionStatus(true);
        setLoadingState(false);
      }, 1500); // 1.5초 후 응답
      
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/v1/chat/`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({ 
         message: message
       })
     });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    lastResponseTime = Date.now() - startTime;
    
    hideTyping();
    displayMessage(data.response, 'bot', data.question_type);
    
    // 후속 질문 제안 표시
    if (data.suggested_questions) {
      showSuggestedQuestions(data.suggested_questions);
    }
    
    updateResponseTime();
    setConnectionStatus(true);
    
  } catch (error) {
    console.error('API 요청 실패:', error);
    hideTyping();
    displayMessage('죄송합니다. 현재 서비스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.', 'error');
    setConnectionStatus(false);
  } finally {
    setLoadingState(false);
  }
}

// 임시 응답 생성 함수 (테스트용)
function generateMockResponse(message) {
  const responses = {
    '프로젝트': {
      response: '안녕하세요! 프로젝트에 대해 질문해주셨네요. 저는 다양한 웹 개발 프로젝트를 진행해왔습니다. 주요 프로젝트로는:\n\n• **포트폴리오 웹사이트**: React와 Node.js를 활용한 개인 포트폴리오\n• **쇼핑몰 플랫폼**: 풀스택 개발 경험을 쌓은 이커머스 사이트\n• **데이터 시각화 대시보드**: Chart.js와 D3.js를 활용한 인터랙티브 차트\n\n어떤 프로젝트에 대해 더 자세히 알고 싶으신가요?',
      question_type: 'project',
      suggested_questions: ['기술 스택은 무엇인가요?', '프로젝트 규모는 어느 정도인가요?', '어떤 문제를 해결했나요?']
    },
    '기술': {
      response: '기술 스택에 대해 질문해주셨네요! 제 주요 기술 스택은 다음과 같습니다:\n\n**프론트엔드**:\n• React, Vue.js, HTML5, CSS3, JavaScript/TypeScript\n• Bootstrap, Tailwind CSS, SASS\n\n**백엔드**:\n• Node.js, Python, Java\n• Express.js, Django, Spring Boot\n\n**데이터베이스**:\n• MySQL, PostgreSQL, MongoDB\n\n**기타**:\n• Git, Docker, AWS, CI/CD\n\n특정 기술에 대해 더 자세히 알고 싶으신가요?',
      question_type: 'technical',
      suggested_questions: ['가장 자신 있는 기술은?', '새로운 기술을 어떻게 학습하나요?', '프로젝트에서 기술 선택 기준은?']
    },
    '강점': {
      response: '개발자로서의 강점에 대해 질문해주셨네요! 제 주요 강점은 다음과 같습니다:\n\n**1. 문제 해결 능력**\n• 복잡한 요구사항을 체계적으로 분석하고 해결\n• 디버깅과 트러블슈팅에 대한 경험과 인내심\n\n**2. 학습 능력**\n• 새로운 기술을 빠르게 습득하고 적용\n• 지속적인 자기계발과 기술 트렌드 파악\n\n**3. 협업 능력**\n• 팀 프로젝트에서 원활한 소통과 협력\n• 코드 리뷰와 지식 공유를 통한 성장\n\n**4. 사용자 중심 사고**\n• UX/UI를 고려한 개발 접근\n• 사용자 피드백을 반영한 개선\n\n어떤 부분에 대해 더 자세히 알고 싶으신가요?',
      question_type: 'personal',
      suggested_questions: ['팀워크 경험은?', '스트레스 관리는 어떻게?', '장기적인 목표는?']
    }
  };
  
  // 메시지 내용에 따라 적절한 응답 선택
  if (message.includes('프로젝트') || message.includes('작업') || message.includes('개발')) {
    return responses['프로젝트'];
  } else if (message.includes('기술') || message.includes('스택') || message.includes('언어')) {
    return responses['기술'];
  } else if (message.includes('강점') || message.includes('장점') || message.includes('특징')) {
    return responses['강점'];
  } else {
    // 기본 응답
    return {
      response: '좋은 질문이네요! 제가 도움을 드릴 수 있는 부분이 있다면 언제든 말씀해주세요. 프로젝트 경험이나 기술 스택, 개인적인 강점 등에 대해 궁금한 것이 있으시면 구체적으로 질문해주시면 더 자세히 답변드릴 수 있습니다.',
      question_type: 'general',
      suggested_questions: ['프로젝트 경험을 들려주세요', '기술 스택은 무엇인가요?', '개발자로서의 강점은?']
    };
  }
}

// 메시지 표시
function displayMessage(message, sender, questionType = null) {
  const messagesDiv = document.getElementById('messages');
  if (!messagesDiv) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender} message-enter`;
  
  const timestamp = new Date().toLocaleTimeString();
  
  if (sender === 'user') {
    messageDiv.innerHTML = `
      <div class="d-flex justify-content-end mb-4">
        <div class="chat-message user-message">
          <div class="message-content">${escapeHtml(message)}</div>
          <div class="message-time small mt-2" style="opacity: 0.8;">
            <i class="fas fa-clock me-1"></i>${timestamp}
          </div>
        </div>
        <div class="rounded-circle d-flex align-items-center justify-content-center ms-3" style="width: 35px; height: 35px; background: var(--global-text-color-light); color: white;">
          <i class="fas fa-user"></i>
        </div>
      </div>
    `;
  } else if (sender === 'bot') {
    const typeIcon = getQuestionTypeIcon(questionType);
    messageDiv.innerHTML = `
      <div class="d-flex justify-content-start mb-4">
        <div class="rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 35px; height: 35px; background: var(--global-theme-color); color: white;">
          <i class="fas fa-robot"></i>
        </div>
        <div class="chat-message bot-message">
          ${typeIcon ? `<div class="small text-primary mb-2 fw-bold">${typeIcon}</div>` : ''}
          <div class="message-content">${formatBotMessage(message)}</div>
          <div class="message-time text-muted small mt-2">
            <i class="fas fa-clock me-1"></i>${timestamp}
          </div>
        </div>
      </div>
    `;
  } else if (sender === 'error') {
    messageDiv.innerHTML = `
      <div class="d-flex justify-content-center mb-4">
        <div class="chat-message error-message">
          <div class="message-content">
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${escapeHtml(message)}
          </div>
          <div class="message-time small mt-2" style="opacity: 0.8;">
            <i class="fas fa-clock me-1"></i>${timestamp}
          </div>
        </div>
      </div>
    `;
  }
  
  messagesDiv.appendChild(messageDiv);
  scrollToBottom();
  
  // 대화 저장
  saveConversation(message, sender, questionType);
}

// 타이핑 인디케이터 표시
function showTyping() {
  isTyping = true;
  const messagesDiv = document.getElementById('messages');
  if (!messagesDiv) return;
  
  const typingDiv = document.createElement('div');
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <div class="d-flex justify-content-start mb-4">
      <div class="rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 35px; height: 35px; background: var(--global-theme-color); color: white;">
        <i class="fas fa-robot"></i>
      </div>
      <div class="chat-message bot-message">
        <span class="typing-dots">
          <span>•</span><span>•</span><span>•</span>
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
  
  // 최대 100개 메시지만 저장
  if (conversations.length > 100) {
    conversations = conversations.slice(-100);
  }
  
  localStorage.setItem('chatHistory', JSON.stringify(conversations));
}

function loadChatHistory() {
  const conversations = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  conversations.forEach(conv => {
    if (conv.sender !== 'system') { // 시스템 메시지 제외
      displayMessage(conv.message, conv.sender, conv.questionType);
    }
  });
}

function clearChat() {
  if (confirm('대화를 모두 삭제하시겠습니까?')) {
    const messagesDiv = document.getElementById('messages');
    const suggestedQuestionsDiv = document.getElementById('suggestedQuestions');
    
    if (messagesDiv) {
      messagesDiv.innerHTML = `
        <div class="message bot">
          <div class="d-flex justify-content-start mb-4">
            <div class="rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 35px; height: 35px; background: var(--global-theme-color); color: white;">
              <i class="fas fa-robot"></i>
            </div>
            <div class="chat-message bot-message">
              <div class="message-content">
                대화가 초기화되었습니다. 새로운 질문을 해주세요! 😊
              </div>
              <div class="message-time text-muted small mt-2">
                <i class="fas fa-clock me-1"></i>
                <script>document.write(new Date().toLocaleTimeString());</script>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    localStorage.removeItem('chatHistory');
    
    if (suggestedQuestionsDiv) {
      suggestedQuestionsDiv.style.display = 'none';
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
  // 간단한 마크다운 스타일 변환
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



function setConnectionStatus(connected) {
  const status = document.getElementById('connectionStatus');
  if (!status) return;
  
  // 전역 연결 상태 업데이트
  isConnected = connected;
  
  if (connected) {
    status.innerHTML = '<i class="fas fa-circle me-1"></i>연결됨';
    status.className = 'badge rounded-pill';
    status.style.background = 'var(--global-tip-block)';
    status.style.color = 'white';
    
    // 연결됨: 채팅창 흐림 효과 제거
    setChatBlur(false);
    enableChatInput(true);
  } else {
    status.innerHTML = '<i class="fas fa-circle me-1"></i>연결 오류';
    status.className = 'badge rounded-pill offline';
    status.style.background = 'var(--global-danger-block)';
    status.style.color = 'white';
    
    // 연결 안됨: 채팅창 흐림 효과 적용
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

async function checkConnectionStatus() {
  // API 서버가 설정되지 않은 경우 (테스트 모드)
  if (API_BASE_URL === 'https://your-domain.duckdns.org:8000') {
    setConnectionStatus(true); // 테스트 모드에서는 연결됨으로 표시
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/v1/health/`, { method: 'GET' });
    setConnectionStatus(response.ok);
  } catch (error) {
    setConnectionStatus(false);
  }
}

// 채팅창 흐림 효과 제어
function setChatBlur(blur) {
  const chatContainer = document.getElementById('chat-container');
  const chatMessages = document.getElementById('chat-messages');
  
  if (chatContainer) {
    if (blur) {
      chatContainer.style.filter = 'blur(2px)';
      chatContainer.style.opacity = '0.6';
      chatContainer.style.pointerEvents = 'none';
    } else {
      chatContainer.style.filter = 'none';
      chatContainer.style.opacity = '1';
      chatContainer.style.pointerEvents = 'auto';
    }
  }
  
  if (chatMessages) {
    if (blur) {
      chatMessages.style.filter = 'blur(2px)';
      chatMessages.style.opacity = '0.6';
    } else {
      chatMessages.style.filter = 'none';
      chatMessages.style.opacity = '1';
    }
  }
}

// 채팅 입력 필드 활성화/비활성화
function enableChatInput(enable) {
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('sendBtn');
  const charCount = document.getElementById('charCount');
  
  if (userInput) {
    userInput.disabled = !enable;
    userInput.placeholder = enable ? '메시지를 입력하세요...' : '서버 연결 오류로 메시지를 보낼 수 없습니다';
  }
  
  if (sendBtn) {
    sendBtn.disabled = !enable;
  }
  
  if (charCount) {
    charCount.style.color = enable ? 'var(--global-text-color-light)' : 'var(--global-danger-block)';
  }
}

// 주기적으로 연결 상태 확인 (옵션)
setInterval(checkConnectionStatus, 30000); // 30초마다 체크
