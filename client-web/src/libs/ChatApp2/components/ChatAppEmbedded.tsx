import { useEffect } from "react"
import { useChatStore } from "../store/useChatStore"
import getChat from "../utils/getChat"
import ChatList from "./ChatList"
import ChatMessages from "./ChatMessages"
import ChatInput from "./ChatInput/ChatInput"

import './ChatAppEmbedded.scss'
import { ChatHeader } from "./ChatHeader"

export default function ChatAppEmbeded() {
    const inited = useChatStore(state => state.inited)
    const chatId = useChatStore(state => state.chatId)
    const chatList = useChatStore(state => state.chatList)

    const chat = inited && getChat(chatList, chatId)

    return (
        <div className="ChatAppEmbedded">
            {!inited ?
                (<div className="ChatAppEmbedded__loading">loading...</div>) :
                (
                    <>
                        <div className="ChatAppEmbedded__left">
                            <ChatList chatId={chatId} chatList={chatList} />
                        </div>
                        <div className="ChatAppEmbedded__right">
                            <ChatHeader chat={chat}/>
                            <ChatMessages chat={chat} />
                            <ChatInput chat={chat} chatId={chatId} />
                        </div>
                    </>
                )
            }
        </div>
    )
}
