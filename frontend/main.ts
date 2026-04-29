import "./index.scss";
import { io } from "socket.io-client";
import Experience from "./Experience/Experience.js";
import elements from "./Experience/Utils/functions/elements.js";
import { initRunContextFromURL } from "./Experience/Utils/RunContext.js";

initRunContextFromURL();

const domElements = elements({
    canvas: ".experience-canvas",
    chatContainer: ".chat-container",
    messageSubmitButton: "#chat-message-button",
    messageInput: "#chat-message-input",
    inputWrapper: ".message-input-wrapper",
});

const socketUrl = new URL("/", window.location.href);

const chatSocket = io(socketUrl.toString() + "chat");
const updateSocket = io(socketUrl.toString() + "update");
let userName = "";

const experience = new Experience(
    domElements.canvas as unknown as HTMLCanvasElement,
    updateSocket,
);
void experience;

experience.preloader.onPlayerReady = (name: string) => {
    userName = name;
    chatSocket.emit("setName", userName);
    updateSocket.emit("setName", userName);
    updateSocket.emit("setAvatar", "placeholder-character");

    experience.debugBus.emit("ui", "entering-whitebox", { name: userName });
};

chatSocket.on("connect", () => {});

domElements.messageSubmitButton.addEventListener("click", handleMessageSubmit);
domElements.chatContainer.addEventListener("click", handleChatClick);
document.addEventListener("keydown", handleMessageSubmit);

function handleChatClick(): void {
    if (domElements.inputWrapper.classList.contains("hidden"))
        domElements.inputWrapper.classList.remove("hidden");
}

function handleMessageSubmit(event: Event): void {
    if (
        (event instanceof KeyboardEvent && event.key === "Enter") ||
        event.type === "click"
    ) {
        domElements.inputWrapper.classList.toggle("hidden");
        (domElements.messageInput as HTMLInputElement).focus();

        if ((domElements.messageInput as HTMLInputElement).value === "") return;
        const text = (
            domElements.messageInput as HTMLInputElement
        ).value.substring(0, 500);
        displayMessage(userName, text, getTime());
        chatSocket.emit("send-message", text, getTime());
        (domElements.messageInput as HTMLInputElement).value = "";
    }
}

function getTime(): string {
    const currentDate = new Date();
    const hours = currentDate.getHours().toString().padStart(2, "0");
    const minutes = currentDate.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
}

function displayMessage(name: string, message: string, time: string): void {
    const messageDiv = document.createElement("div");
    messageDiv.innerHTML = `<span class="different-color">[${time}] ${name}:</span> ${message}`;
    domElements.chatContainer.append(messageDiv);
    domElements.chatContainer.scrollTop =
        domElements.chatContainer.scrollHeight;
}

chatSocket.on(
    "received-message",
    (name: string, message: string, time: string) => {
        displayMessage(name, message, time);
    },
);

updateSocket.on("connect", () => {});
