const quotes = [
     {
        quotes: "hello",
        author: "roy"},
     {
         quotes: "hello2",
         author: "kylie"
     },
     {
         quotes: "hello3",
         author: "james"
     },
     {
         quotes: "hello4",
         author: "jin"
     },
     {
         quotes: "hello5",
         author: "woogie"
     },
     {
        quotes: "hello6",
        author: "cindy"
     },
     {
         quotes: "hello7",
         author: "mia"
     },
     {
         quotes: "hello8",
         author: "charlie"
     },
     {
         quotes: "hello9",
         author: "emma"
     },
     {
         quotes: "hello10",
         author: "jun"
     },
     {
         quotes: "hello11",
         author: "joey"
     }

]

const quote = document.querySelector("#quote span:first-child");
const author = document.querySelector("#quote span:last-child");

const randomIdx = quotes[Math.floor(Math.random() * quotes.length)];

quote.innerText = randomIdx.quotes;
author.innerText = randomIdx.author;