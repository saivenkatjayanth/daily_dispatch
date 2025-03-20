const NEWS_API_KEY = "69fba3a0320e4bb0aaa22ab24c04311c"; 
const GROQ_API_KEY = "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"; 
const newsUrl = "https://newsapi.org/v2/everything?q=";
const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
const ITEMS_PER_PAGE = 20;

let currentPage = 1;
let totalResults = 0;
let currentQuery = "India";
let allArticles = [];
let chatHistory = [];

window.addEventListener("load", () => fetchNews(currentQuery));

function reload() {
    window.location.reload();
}

async function fetchNews(query) {
    currentQuery = query;
    const res = await fetch(`${newsUrl}${query}&apiKey=${NEWS_API_KEY}&pageSize=100`);
    const data = await res.json();
    allArticles = data.articles
        .filter(article => article.urlToImage)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    totalResults = allArticles.length;
    currentPage = 1;
    bindData();
}

function bindData() {
    const cardsContainer = document.getElementById("cards-container");
    const newsCardTemplate = document.getElementById("template-news-card");
    const pageInfo = document.getElementById("page-info");
    const prevButton = document.getElementById("prev-page");
    const nextButton = document.getElementById("next-page");

    cardsContainer.innerHTML = "";

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentArticles = allArticles.slice(startIndex, endIndex);

    currentArticles.forEach((article) => {
        const cardClone = newsCardTemplate.content.cloneNode(true);
        fillDataInCard(cardClone, article);
        cardsContainer.appendChild(cardClone);
    });

    const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
}

function fillDataInCard(cardClone, article) {
    const newsImg = cardClone.querySelector("#news-img");
    const newsTitle = cardClone.querySelector("#news-title");
    const newsSource = cardClone.querySelector("#news-source");
    const newsDesc = cardClone.querySelector("#news-desc");

    newsImg.src = article.urlToImage;
    newsTitle.innerHTML = article.title;
    newsDesc.innerHTML = article.description || "No description available";

    const date = new Date(article.publishedAt).toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    newsSource.innerHTML = `${article.source.name} · ${date}`;

    cardClone.firstElementChild.addEventListener("click", () => {
        window.open(article.url, "_blank");
    });
}

let curSelectedNav = null;
function onNavItemClick(id) {
    fetchNews(id);
    const navItem = document.getElementById(id);
    curSelectedNav?.classList.remove("active");
    curSelectedNav = navItem;
    curSelectedNav.classList.add("active");
    document.getElementById("menu-dropdown").classList.remove("active");
}

const searchButton = document.getElementById("search-button");
const searchText = document.getElementById("search-text");
const themeToggle = document.getElementById("theme-toggle");
const menuToggle = document.getElementById("menu-toggle");
const menuDropdown = document.getElementById("menu-dropdown");
const prevPage = document.getElementById("prev-page");
const nextPage = document.getElementById("next-page");
const widgetButton = document.getElementById("widget-button");
const widgetContent = document.getElementById("widget-content");
const summaryTab = document.getElementById("summary-tab");
const chatTab = document.getElementById("chat-tab");
const summaryPanel = document.getElementById("summary-panel");
const chatPanel = document.getElementById("chat-panel");
const summaryText = document.getElementById("summary-text");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendChat = document.getElementById("send-chat");
const closeWidget = document.getElementById("close-widget");

searchButton.addEventListener("click", () => {
    const query = searchText.value;
    if (!query) return;
    fetchNews(query);
    curSelectedNav?.classList.remove("active");
    curSelectedNav = null;
});

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    localStorage.setItem("theme", document.body.classList.contains("dark-theme") ? "dark" : "light");
});

menuToggle.addEventListener("click", () => {
    menuDropdown.classList.toggle("active");
});

prevPage.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        bindData();
    }
});

nextPage.addEventListener("click", () => {
    if (currentPage < Math.ceil(totalResults / ITEMS_PER_PAGE)) {
        currentPage++;
        bindData();
    }
});

if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-theme");
}

widgetButton.addEventListener("click", () => {
    widgetContent.classList.toggle("active");
    if (widgetContent.classList.contains("active") && summaryTab.classList.contains("active")) {
        generateSummary();
    }
});

closeWidget.addEventListener("click", () => {
    widgetContent.classList.remove("active");
});

summaryTab.addEventListener("click", () => {
    summaryTab.classList.add("active");
    chatTab.classList.remove("active");
    summaryPanel.style.display = "block";
    chatPanel.style.display = "none";
    generateSummary();
});

chatTab.addEventListener("click", () => {
    chatTab.classList.add("active");
    summaryTab.classList.remove("active");
    chatPanel.style.display = "block";
    summaryPanel.style.display = "none";
});

sendChat.addEventListener("click", async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    addChatMessage("user", message);
    chatInput.value = "";
    await chatWithBot(message);
});

chatInput.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
        sendChat.click();
    }
});

async function generateSummary() {
    summaryText.textContent = "Generating summary...";
    const articles = Array.from(document.querySelectorAll(".card-content"));
    if (articles.length === 0) {
        summaryText.textContent = "No articles available to summarize.";
        return;
    }

    const contentToSummarize = articles.map(article => {
        const title = article.querySelector("#news-title").textContent;
        const desc = article.querySelector("#news-desc").textContent;
        return `${title}: ${desc}`;
    }).join("\n\n");

    try {
        const response = await fetch(groqUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gemma2-9b-it",
                messages: [{
                    role: "user",
                    content: `Please provide a concise summary of the following news articles:\n\n${contentToSummarize}`
                }],
                max_tokens: 150,
                temperature: 0.7
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.choices && data.choices[0].message && data.choices[0].message.content) {
            summaryText.textContent = data.choices[0].message.content;
        } else {
            throw new Error("Unexpected API response format");
        }
    } catch (error) {
        console.error("Summarization error:", error);
        const fallbackSummary = contentToSummarize.split("\n\n").map(item => item.split(":")[0]).join("; ");
        summaryText.textContent = `Failed to connect to GroqCloud. Basic summary: ${fallbackSummary.substring(0, 200)}...`;
    }
}

async function chatWithBot(message) {
    addChatMessage("bot", "Thinking...");
    chatHistory.push({ role: "user", content: message });

    try {
        const response = await fetch(groqUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gemma2-9b-it",
                messages: chatHistory,
                max_tokens: 200,
                temperature: 0.7
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.choices && data.choices[0].message && data.choices[0].message.content) {
            const botResponse = data.choices[0].message.content;
            chatHistory.push({ role: "assistant", content: botResponse });
            updateLastBotMessage(botResponse);
        } else {
            throw new Error("Unexpected API response format");
        }
    } catch (error) {
        console.error("Chat error:", error);
        updateLastBotMessage("Sorry, I couldn't connect to GroqCloud. Try again later.");
    }
}

function addChatMessage(sender, text) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("chat-message", sender);
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateLastBotMessage(text) {
    const lastMessage = chatMessages.lastElementChild;
    if (lastMessage && lastMessage.classList.contains("bot")) {
        lastMessage.textContent = text;
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.addEventListener("click", (e) => {
    if (!menuToggle.contains(e.target) && !menuDropdown.contains(e.target)) {
        menuDropdown.classList.remove("active");
    }
});