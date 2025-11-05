import { useState } from "react";
import styles from "./Chat.module.scss";

interface Message {
    id: number;
    sender: "me" | "other";
    name: string;
    text: string;
    time: string;
}

interface ChatItem {
    id: number;
    name: string;
    specialty: string;
    lastMessage: string;
    time: string;
}

function Chat(){
    const [activeTab, setActiveTab] = useState<"active" | "archive">("active");
    const [selectedChat, setSelectedChat] = useState<number | null>(1);

    const activeChats: ChatItem[] = [
        { id: 1, name: "ФИО", specialty: "специальность", lastMessage: "смс последняя", time: "10.00" },
        { id: 2, name: "ФИО", specialty: "специальность", lastMessage: "смс последняя", time: "10.00" },
        { id: 3, name: "ФИО", specialty: "специальность", lastMessage: "смс последняя", time: "10.00" },
        { id: 4, name: "ФИО", specialty: "специальность", lastMessage: "смс последняя", time: "10.00" },
        { id: 5, name: "ФИО", specialty: "специальность", lastMessage: "смс последняя", time: "10.00" },
    ];

    const archiveChats: ChatItem[] = [
        { id: 4, name: "ФИО", specialty: "специальность", lastMessage: "смс последняя", time: "09.00" },
        { id: 5, name: "ФИО", specialty: "специальность", lastMessage: "смс последняя", time: "08.00" },
    ];

    const messages: Message[] = [
        { id: 1, sender: "other", name: "ФИО", text: "смс последняя", time: "00:00" },
        { id: 2, sender: "me", name: "ФИО", text: "смс последняя", time: "00:00" },
        { id: 3, sender: "other", name: "ФИО", text: "смс последняя", time: "00:00" },
    ];

    const currentChat = [...activeChats, ...archiveChats].find(c => c.id === selectedChat);

    return (
        <div className={styles.chat}>
            <div className={styles.sidebar}>
                <div className={styles.searchBar}>
                    <svg className={styles.searchIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#clip0_324_3513)">
                            <path d="M9.9975 16.1825C13.6895 16.1825 16.6825 13.1895 16.6825 9.4975C16.6825 5.80548 13.6895 2.8125 9.9975 2.8125C6.30548 2.8125 3.3125 5.80548 3.3125 9.4975C3.3125 13.1895 6.30548 16.1825 9.9975 16.1825Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                            <path d="M21.6875 21.1876L14.5912 14.0913" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                        </g>
                        <defs>
                            <clipPath id="clip0_324_3513">
                                <rect width="21" height="21" fill="white" transform="translate(2 1.5)"/>
                            </clipPath>
                        </defs>
                    </svg>

                    <input
                        type="text"
                        placeholder="Поиск"
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === "active" ? styles.active : ""}`}
                        onClick={() => setActiveTab("active")}
                    >
                        Активные
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "archive" ? styles.active : ""}`}
                        onClick={() => setActiveTab("archive")}
                    >
                        Архив
                    </button>
                </div>

                <div className={styles.chatList}>
                    {(activeTab === "active" ? activeChats : archiveChats).map(chat => (
                        <div
                            key={chat.id}
                            className={`${styles.chatItem} ${selectedChat === chat.id ? styles.selected : ""}`}
                            onClick={() => setSelectedChat(chat.id)}
                        >
                            <div className={styles.avatar}></div>
                            <div className={styles.chatInfo}>
                                <div className={styles.name}>{chat.name}</div>
                                <div className={styles.specialty}>{chat.specialty}</div>
                                <div className={styles.lastMessage}>{chat.lastMessage}</div>
                            </div>
                            <div className={styles.chatMeta}>
                                <svg className={styles.star} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_186_6434)">
                                        <g clipPath="url(#clip1_186_6434)">
                                            <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M12 19V18.98" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_186_6434">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                        <clipPath id="clip1_186_6434">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                                <div className={styles.time}>{chat.time}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.chatArea}>
                {currentChat ? (
                    <>
                        <div className={styles.chatHeader}>
                            <div className={styles.headerLeft}>
                                <div className={styles.avatar}></div>
                                <div className={styles.headerInfo}>
                                    <div className={styles.name}>{currentChat.name}</div>
                                    <div className={styles.order}>название заказа</div>
                                </div>
                            </div>
                            <div className={styles.headerRight}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_186_6434)">
                                        <g clipPath="url(#clip1_186_6434)">
                                            <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M12 19V18.98" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_186_6434">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                        <clipPath id="clip1_186_6434">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                                <div className={styles.time}>{currentChat.time}</div>
                            </div>
                        </div>

                        <div className={styles.chatMessages}>
                            <div className={styles.date}>Дата</div>
                            {messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`${styles.message} ${msg.sender === "me" ? styles.myMessage : styles.theirMessage}`}
                                >
                                    <div className={styles.messageName}>{msg.name}</div>
                                    <div className={styles.messageText}>{msg.text}</div>
                                    <div className={styles.messageTime}>{msg.time}</div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.chatInput}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_324_3513)">
                                    <path d="M9.9975 16.1825C13.6895 16.1825 16.6825 13.1895 16.6825 9.4975C16.6825 5.80548 13.6895 2.8125 9.9975 2.8125C6.30548 2.8125 3.3125 5.80548 3.3125 9.4975C3.3125 13.1895 6.30548 16.1825 9.9975 16.1825Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                    <path d="M21.6875 21.1876L14.5912 14.0913" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                </g>
                                <defs>
                                    <clipPath id="clip0_324_3513">
                                        <rect width="21" height="21" fill="white" transform="translate(2 1.5)"/>
                                    </clipPath>
                                </defs>
                            </svg>
                            <input
                                type="text"
                                placeholder="Введите сообщение"
                                className={styles.inputField}
                            />
                        </div>
                    </>
                ) : (
                    <div className={styles.noChat}>Выберите чат</div>
                )}
            </div>
        </div>
    );
};

export default Chat;
