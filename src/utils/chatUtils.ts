import { getAuthToken } from './auth';

const API_BASE_URL = 'https://admin.ustoyob.tj';

export const createChatWithAuthor = async (authorId: number) => {
    const token = getAuthToken();
    if (!token) {
        alert('Пожалуйста, войдите в систему');
        return null;
    }

    try {
        const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        });

        if (!userResponse.ok) {
            throw new Error('Не удалось получить информацию о пользователе');
        }

        const chatResponse = await fetch(`${API_BASE_URL}/api/chats`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                replyAuthor: `/api/users/${authorId}`
            })
        });

        if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            console.log('Chat created successfully:', chatData);
            return chatData;
        } else {
            const errorText = await chatResponse.text();
            console.error('Error creating chat:', errorText);
            return null;
        }
    } catch (error) {
        console.error('Error creating chat:', error);
        return null;
    }
};