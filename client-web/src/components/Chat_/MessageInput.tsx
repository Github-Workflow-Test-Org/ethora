import { useRef, useState } from "react"

import { wsClient } from "../../api/wsClient_"
import { useChatStore } from "../../store_"
import { AxiosResponse } from "axios"
import { Dialog } from '@headlessui/react'
import { PaperClipIcon } from "./Icons/PaperClipIcon"
import { PaperPlaneIcon } from "./Icons/PaperPlane"
import { MessageType } from "../../store_/chat"

import "./MessageInput.scss"

type MessageInputProps = {
  sendFile: (formData: FormData) => Promise<AxiosResponse<any, any>>,
  mainMessage?: MessageType | null
  shouldSendToTheRoom?: boolean
}

export function MessageInput(props: MessageInputProps) {
  const { sendFile, mainMessage, shouldSendToTheRoom } = props;
  const [blockControls, setBlockControls] = useState(false)

  const [file, setFile] = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentRoom = useChatStore(state => state.currentRoom)
  const editMessage = useChatStore(state => state.editMessage)
  const setEditMessage = useChatStore(state => state.setEditMessage)
  const doEditMessage = useChatStore(state => state.doEditMessage)

  const [text, setText] = useState('')

  const send = async () => {
    if (editMessage) {
      wsClient.editMessage(currentRoom.jid, text, editMessage.id)
      setEditMessage(null)
      doEditMessage(currentRoom.jid, text, editMessage.id)
      setText('')
    } else if (mainMessage) {
      if (shouldSendToTheRoom) {
        await wsClient.sendTextMessageToThread(currentRoom.jid, mainMessage, text, true)
      } else {
        await wsClient.sendTextMessageToThread(currentRoom.jid, mainMessage, text)
        setText('')
      }

    } else {
      const message = await wsClient.sendTextMessage(currentRoom.jid, text) as Record<string, string>
      setText('')
    }
  }

  const handleKeyPress = async (e) => {
    if (e.key == 'Enter') {
      send()
    }
  }

  const onFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const onFileChange = async (e) => {
    const file = e.target.files[0]

    if (file) {
      setFile(file)
    }
  }

  const onFileSend = async () => {
    const fd = new FormData()

    fd.append("files", file)

    try {
      setBlockControls(true)
      let result = await sendFile(fd)

      if (result.data.success) {
        const fileOnServer = result.data.results[0]

        wsClient.sendMediaMessage(currentRoom.jid, fileOnServer)
      }

      setBlockControls(false)
      setFile(null)
    } catch (error) {
      console.log(error)
    }

  }

  const cancelEdit = () => {
    setEditMessage(null)
  }

  return (
    <>
      {
        editMessage && (
          <div className="edit-message">
            <div>Edit Message</div>
            <div>{editMessage.text}</div>
            <div>
              <button onClick={cancelEdit}>cancel</button></div>
            </div>
        )
      }
      <div className={'massage-input-root'}>
        <form style={{ display: 'none' }}>
          <input onChange={onFileChange} type="file" ref={fileInputRef} />
        </form>
        <div className={'tools'}>
          {
            sendFile && (
              <button className="send-file-btn" onClick={onFile}>
                <PaperClipIcon />
              </button>
            )
          }
        </div>
        <div className={'input-wrapper'}>
          <input onKeyDown={(e) => handleKeyPress(e)} type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message here"></input>
        </div>
        <div className={'right-tools'}>
          <button className="send-file-btn" onClick={send}>
            <PaperPlaneIcon />
          </button>
        </div>
        {
          file && (
            <Dialog className="file-dialog" open={!!file} onClose={() => { }}>
              <Dialog.Panel className="inner">
                <p>
                  <img className={'preview-image'} src={URL.createObjectURL(file)}></img>
                </p>

                <button disabled={blockControls} onClick={onFileSend}>Send</button>
                <button disabled={blockControls} onClick={() => { setFile(null) }}>Cancel</button>
              </Dialog.Panel>
            </Dialog>
          )
        }
      </div>
    </>
  )
}
