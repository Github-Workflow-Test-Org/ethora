import { ModelChat, ModelChatMessage } from "../models"

export default function getChatLastMessage(chat: ModelChat): ModelChatMessage | undefined {
    const messages = chat.messages
    const l = messages.length

    if (l > 0) {
        return messages[l - 1]
    }
}