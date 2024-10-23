'use client'
import React from 'react'
import { useState, useRef, useEffect } from 'react'
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import BlackHole1 from './BlackHole1'
import BlackHole2 from './BlackHole2'



const functionUrl = 'https://owdozx7zlpbtwmen76ru6u6t2a0rxuiu.lambda-url.us-east-2.on.aws/'

const sendIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-send-fill size-4" viewBox="0 0 16 16"><path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471z"/></svg>
const thumbUpIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-[14px]"><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" /></svg>
const thumbDownIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-[14px]"><path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.487-.36 2.89-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 0 0 .303-.54" /></svg>
const thumbUpSolid = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-[14px]"><path d="M7.493 18.5c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.125c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75A.75.75 0 0 1 15 2a2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM2.331 10.727a11.969 11.969 0 0 0-.831 4.398 12 12 0 0 0 .52 3.507C2.28 19.482 3.105 20 3.994 20H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 0 1-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227Z" /></svg>
const thumbDownSolid = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-[14px]"><path d="M15.73 5.5h1.035A7.465 7.465 0 0 1 18 9.625a7.465 7.465 0 0 1-1.235 4.125h-.148c-.806 0-1.534.446-2.031 1.08a9.04 9.04 0 0 1-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.499 4.499 0 0 0-.322 1.672v.633A.75.75 0 0 1 9 22a2.25 2.25 0 0 1-2.25-2.25c0-1.152.26-2.243.723-3.218.266-.558-.107-1.282-.725-1.282H3.622c-1.026 0-1.945-.694-2.054-1.715A12.137 12.137 0 0 1 1.5 12.25c0-2.848.992-5.464 2.649-7.521C4.537 4.247 5.136 4 5.754 4H9.77a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23ZM21.669 14.023c.536-1.362.831-2.845.831-4.398 0-1.22-.182-2.398-.52-3.507-.26-.85-1.084-1.368-1.973-1.368H19.1c-.445 0-.72.498-.523.898.591 1.2.924 2.55.924 3.977a8.958 8.958 0 0 1-1.302 4.666c-.245.403.028.959.5.959h1.053c.832 0 1.612-.453 1.918-1.227Z" /></svg>
const clipboardIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-[13px]"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
const checkIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-check" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/></svg>
const pencilIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-pencil-fill size-[15px]" viewBox="0 0 16 16"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/></svg>
const paperIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-file-earmark-check-fill size-[15px]" viewBox="0 0 16 16"><path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0M9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1m1.354 4.354-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708.708"/></svg>
const doubleCheckIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-check-all size-[15px]" viewBox="0 0 16 16"><path d="M8.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L2.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093L8.95 4.992zm-.92 5.14.92.92a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 1 0-1.091-1.028L9.477 9.417l-.485-.486z"/></svg>
const stopIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6"><path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" /></svg>
const userIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
const dotIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-three-dots-vertical size-4" viewBox="0 0 16 16"><path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/></svg>


type Message = {
  text: string,
  sender: 'ai' | 'user'
  timestamp: string;
};
interface ChatBotProps {
  isOpen: boolean;
  toggleChat: () => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ isOpen }) => {
  const [ newInputValue, setNewInputValue ] = useState('')
  const [ messages, setMessages ] = useState<Message[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [thumbState, setThumbState] = useState<{ [key: number]: { up: boolean, down: boolean } }>({}); 
  const [copyState, setCopyState] = useState<{ [key: number]: boolean }>({}); 
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showInitialMessage, setShowInitialMessage] = useState(true);
  const [isTyping, setIsTyping] = useState(false); 

  {/* Shows initial message when ChatBot opens */}
  useEffect(() => {
    if (isOpen) {
      setShowInitialMessage(true); // Show the initial message when chat opens
    }
  }, [isOpen]);

  {/* New Message Handling and AI Response Logic */}
  const newMessage: React.FormEventHandler = async (e) => {
    e.preventDefault();
    
    //Timestamp Generation User/AI
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    //Creates new User message and appends to message Array
    setNewInputValue('');
    const newMessages: Message[] = [...messages, { text: newInputValue, sender: 'user', timestamp: currentTime}];
    
    //Sends Messages to Backend API for AI response
    console.log('Sending messages:', JSON.stringify(newMessages));
    const response = await fetch(functionUrl, {
       method: 'POST',
       body: JSON.stringify({ messages: newMessages })
    });
    
    //Handle AI response and clean
    let aiResponseText = await response.text();
    console.log('Received AI response:', aiResponseText);
    if (!aiResponseText || aiResponseText === "undefined") {
       aiResponseText = "Error";
    }
    aiResponseText = aiResponseText.replace(/-/g, '');
    console.log('Cleaned AI response:', aiResponseText);

    //Updates Messages array with AI response
    setMessages([...newMessages, { sender: 'ai', text: aiResponseText, timestamp: aiTimestamp }]);

    //Resets height after Message submission
    resetTextareaHeight();
    
    //Hide Initial message after first User Input
    if (showInitialMessage) {
      setShowInitialMessage(false); 
    }

    //Triggers typewriting animation for AI response
    typeMessage(aiResponseText);
    console.log('Messages state after update:', [...newMessages, { sender: 'ai', text: aiResponseText }]);
 
    //Initializes thumb and copy states for new messsage
    const newMessageIndex = newMessages.length;
    setThumbState((prev) => ({
       ...prev,
       [newMessageIndex]: { up: false, down: false }
    }));
    setCopyState((prev) => ({
       ...prev,
       [newMessageIndex]: false
    }));
 };


 {/* Typewriter text */}
 const typeMessage = (message: string) => {
  if (!message) {
    console.log('Typewriter received an empty or undefined message');
    return;
  }
  setTypedMessage(''); 
  setIsTyping(true);
  console.log('Typing message started:', message);

  let index = -1; 
  const typeNextChar = () => {
    if (index < message.length) {
      setTypedMessage((prev) => {
        const charToAdd = message[index];
        if (charToAdd !== undefined) {
          console.log(`Character ${index} added:`, charToAdd, 'ASCII:', charToAdd.charCodeAt(0));
          return prev + charToAdd;
        }
        return prev;
      });
      index++;
      setTimeout(typeNextChar, 50);
    } else {
      console.log('Typing complete for message:', message);
      setIsTyping(false);
    }
  };
  typeNextChar(); 
  };

  

  { /* Thumb up/down buttons */ }
  const toggleThumbUp = (index: number) => {
    setThumbState((prev) => ({
      ...prev,
      [index]: {
        up: !prev[index]?.up, 
        down: false 
      },
    }));
  };
  const toggleThumbDown = (index: number) => {
    setThumbState((prev) => ({
      ...prev,
      [index]: {
        down: !prev[index]?.down, 
        up: false 
      },
    }));
  };


  {/* Copy to clipboard */}
  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopyState((prev) => ({
          ...prev,
          [index]: true,
        }));
        setTimeout(() => {
          setCopyState((prev) => ({
            ...prev,
            [index]: false, 
          }));
        }, 1500);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };



    {/* TextArea Resizing */}
    const maxRows = 5;
    const lineHeight = 24;
    const [isResized, setIsResized] = useState(false);

    const adjustTextareaHeight = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = maxRows * lineHeight; 

      //Sets container height based on content while not exceeding the max height
      const newHeight = Math.min(scrollHeight, maxHeight); 

      const container = textarea.closest('form'); 
      if (!container) return;
      container.style.height = `${newHeight}px`; 
      container.style.transform = `translateY(-${newHeight}px)`;

      textarea.style.height = `${newHeight}px`;

      // If height exceeds max then enable scrolling
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
      setIsResized(newHeight > lineHeight);
    };


    {/* Resets Text Area Height/Container */}
    const resetTextareaHeight = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = 'auto'; 
      textarea.style.overflowY = 'hidden'; 

      const scrollHeight = textarea.scrollHeight;
      const maxHeight = maxRows * lineHeight; 
      const newHeight = Math.min(scrollHeight, maxHeight); 
      const container = textarea.closest('form'); 
      if (!container) return;
      container.style.height = `${newHeight}px`; 
      container.style.transform = `translateY(-${newHeight}px)`;
    };


    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNewInputValue(e.target.value);
      adjustTextareaHeight();
    };
    useEffect(() => {
      if (textareaRef.current) {
        adjustTextareaHeight(); 
      }
    }, []);

  {/* Variants */}
  const initialMessageVariants = {
    hidden: { y: 200, opacity: 0 }, 
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { type: "spring", stiffness: 80, damping: 20, duration: .5, delay: 0.3 }  
    },
    exit: { opacity: 0 },
  };





  return (
    <div className='bg-gray-100 shadow-2xl shadow-blue-600 rounded-xl h-full mx-3'>
        <div className='flex bg-slate-200 p-6 rounded-t-xl w-full justify-between items-center'>
          <h1 className='text-3xl flex justify-start font-semibold tracking-wider'>Farmer AI</h1>
          <div className='flex flex-row items-center'>
              <motion.span 
                className='flex justify-center items-center bg-black text-white size-6 rounded-xl mr-2 cursor-pointer'
                whileHover={{ color: '#9ca3af' }}
                whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}
              > 
                {userIcon}
              </motion.span>
              <motion.span
                className='cursor-pointer'
                whileHover={{ color: '#9ca3af' }}
                whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 400 }}}              
              >
                {dotIcon}
              </motion.span>
          </div>
          
        </div>
        <div className='rounded-lg p-8 h-[520px]  overflow-x-hidden custom-scrollbar2'>

        {/* Initial Message Shown */}
        <AnimatePresence>
          {showInitialMessage && (
            <motion.div
              key="initialMessage"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={initialMessageVariants}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center h-full rounded-xl text-center"
            >

              <span className='text-blue-400 text-sm font-medium -mt-10'> Your Personal AI Assistant </span>
              <div className='mt-2 text-xl font-semibold flex flex-col mb-10'> 
                <span> Hello there, user! </span>
                <span> How can I assist you? </span>
              </div>

              <div className="relative flex justify-center items-center">
                {/* Left BlackHole */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute bg-blue-200 opacity-25 rounded-full z-10 w-[200px] h-[200px]"></div> {/* Background Circle */}
                  <span className="relative z-20">
                    <BlackHole2 />
                  </span>
                </div>

                {/* Middle BlackHole */}
                <div className="relative flex items-center justify-center mx-24">
                  <div className="absolute bg-blue-200 opacity-25 rounded-full z-10 w-[250px] h-[250px]"></div> {/* Background Circle */}
                  <span className="relative z-20">
                    <BlackHole1 />
                  </span>
                </div>

                {/* Right BlackHole */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute bg-blue-200 opacity-25 rounded-full z-10 w-[200px] h-[200px]"></div> {/* Background Circle */}
                  <span className="relative z-20">
                    <BlackHole2 />
                  </span>
                </div>
              </div>
              
              {/* Suggested Cards */}
              <div className="relative flex flex-row justify-center w-full mt-10 -mb-8">
                <div className="relative w-48 transform scale-75">
                  <div className="w-40 absolute bg-gray-300 ml-8 h-full rounded-2xl p-3 opacity-50 z-0 top-[20px]"></div>
                  <div className="w-44 absolute bg-gray-300 ml-4 h-full rounded-2xl p-3 opacity-75 z-0 top-[10px]"></div>
                  <motion.div 
                    className="bg-gray-200 w-full rounded-2xl p-3 relative z-10 cursor-pointer"
                    whileHover={{ scale: 1.05, transition: { type: "spring", stiffness: 400 } }}
                  >
                    <div className="flex flex-row justify-between items-center">
                      <span className="font-medium">Claims</span>
                      <span className="bg-black text-white size-8 rounded-full flex justify-center items-center">
                        {pencilIcon}
                      </span>
                    </div>
                    <div className="mt-6 flex items-end">
                      <span className="text-sm text-gray-400 text-left">My property was fully flooded. Am I covered?</span>
                    </div>
                  </motion.div>
                </div>

                <div className="relative w-48 ml-1 transform scale-75">
                <div className="w-40 absolute bg-gray-300 mr-8 h-full rounded-2xl p-3 opacity-50 z-0 top-[20px]"></div>
                <div className="w-44 absolute bg-gray-300 mr-4 h-full rounded-2xl p-3 opacity-75 z-0 top-[10px]"></div>
                  <motion.div 
                    className="bg-gray-200 w-full rounded-2xl p-3 relative z-10 cursor-pointer"
                    whileHover={{ scale: 1.05, transition: { type: "spring", stiffness: 400 } }}
                  >
                    <div className="flex flex-row justify-between items-center">
                      <span className="font-medium">Underwriting</span>
                      <span className="bg-black text-white size-8 rounded-full flex justify-center items-center">
                        {paperIcon}
                      </span>
                    </div>
                    <div className="mt-6 flex items-end">
                      <span className="text-sm text-gray-400 text-left">Will Farmers inspect my property?</span>
                    </div>
                  </motion.div>
                </div>
              </div>
              

            </motion.div>
          )}
        </AnimatePresence>

          {/* Chat Text Body */}
          {messages.map((message, index) => (
            <motion.p
              key={index}
              className={`flex flex-col mt-4 p-4 text-black font-normal text-sm leading-relaxed tracking-wide rounded-2xl w-auto whitespace-pre-wrap ${
                message.sender === 'ai' ? 'bg-sky-100' : ''
              } ${message.sender === 'user' ? '' : ''}`}
            >
              <div className={`flex flex-row ${message.text.length > 30 ? 'items-start' : 'items-center'}`}>
                {message.sender === 'user' ? <img src="/farmersImages/User1.svg" alt="User1" className="size-12  mr-2"/> : <img src="/farmersImages/FarmerAILogo.svg" alt="FarmersAI Logo" className="size-10  mr-2"/>}
                {message.sender === 'ai' && index === messages.length - 1 ? (
                  <>
                    {typedMessage !== undefined ? typedMessage : message.text}
                  </>
                ) : message.text}
              </div>

              <div className="flex flex-row w-full justify-end text-gray-400 text-[10px] mt-2">
                <span>{message.timestamp}</span>
                <span>{doubleCheckIcon}</span>
              </div>

              <div className='flex flex-col'>
                {message.sender === 'ai' && (
                  <div className='flex mt-6 ml-12'>
                    {/* Thumb up button */}
                    <motion.div 
                      className='bg-white rounded-full size-6 flex items-center justify-center cursor-pointer'
                      whileTap={{ scale: 0.9 }}
                    >
                      <motion.div
                        className={` ${thumbState[index]?.up ? 'text-blue-600' : 'text-gray-400'}`}
                        onClick={() => toggleThumbUp(index)}
                        style={{ cursor: 'pointer' }}
                        whileTap={{ rotate: [0, 50, 0], transition: { type: "spring", stiffness: 400 } }}                                                
                      >
                        {thumbState[index]?.up ? thumbUpSolid : thumbUpIcon}
                      </motion.div>
                    </motion.div>

                    {/* Thumb down button */}
                    <motion.div 
                      className='bg-white rounded-full size-6 flex items-center justify-center cursor-pointer ml-[3px]'
                      whileTap={{ scale: 0.9 }}
                      >
                      <motion.div
                        className={` ${thumbState[index]?.down ? 'text-red-600' : 'text-gray-400'}`}
                        onClick={() => toggleThumbDown(index)}
                        style={{ cursor: 'pointer' }}
                      >
                        {thumbState[index]?.down ? thumbDownSolid : thumbDownIcon}
                      </motion.div>
                    </motion.div>  

                  {/* Copy button */}
                  <div className=' w-full flex items-center justify-end overflow-hidden'>
                    
                      <div key={index}>
                        {message.sender === 'ai' && (
                          <div >
                            <motion.div 
                              className='relative flex items-center bg-white rounded-full w-auto h-auto p-[4px] text-gray-400'
                              layout
                              transition={{
                                layout: {
                                  delay: copyState[index] ? 0: 0.5, 
                                  duration: 0.8, 
                                },
                              }}
                            >
                              {/* Copy and clipboard icon */}
                              <AnimatePresence mode="wait">
                                {!copyState[index] && (
                                  <motion.div
                                    key="copy"
                                    className="flex items-center cursor-pointer justify-center w-full"
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                   
                                    whileHover={{ color: '#2563eb', fontWeight: 'bold' }}
                                    onClick={() => handleCopy(message.text, index)}
                                  >
                                    {clipboardIcon}
                                    <span className='ml-1 text-xs font-normal'>Copy</span>
                                  </motion.div>
                                )}

                                {/* "Copied to Clipboard" message */}
                                {copyState[index] && (
                                  <motion.div
                                    key="copied"
                                    className="flex items-center justify-center w-full text-blue-600 cursor-pointer"
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                  >
                                    <span className='flex text-xs font-semibold whitespace-nowrap'>
                                      Copied to Clipboard
                                    </span>
                                    {checkIcon}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                         
                            </motion.div>
                          </div>
                        )}
                      </div>
                   
                  </div>

                </div>
                )}
              </div>

            </motion.p>
          ))}
        </div>

        {/* TextArea */}      
        <form className="mt-8 px-6" onSubmit={newMessage}>
          <div className="flex flex-row justify-between rounded-3xl bg-gray-200 text-black font-medium p-2 border border-gray-300">
            
            
            <div className="flex-grow flex items-center w-full">
              <textarea
                ref={textareaRef}
                placeholder="Message FarmerAI"
                value={newInputValue}
                onChange={handleInputChange}
                rows={1}
                className="w-full bg-gray-200 focus:outline-none ml-2 resize-none overflow-y-auto custom-scrollbar"
                style={{ height: 'auto' }} 
              />
            </div>

            {/* Send Button */}
            <div className="flex flex-col justify-end ml-2">
              <motion.div className="flex items-end">
              <motion.button
                type="submit"
                className={`ml-2 text-white justify-center flex items-center rounded-full size-8 ${
                  isTyping ? 'bg-gray-400 cursor-pointer' : 'bg-black' 
                }`}
                whileHover={isTyping ? {} : { color: '#e5e7eb' }} 
                whileTap={isTyping ? {} : { color: '#e5e7eb', scale: 0.95, transition: { type: 'spring', stiffness: 300 } }}
                disabled={isTyping}  
              >
                {isTyping ? stopIcon : sendIcon} 
              </motion.button>
              </motion.div>
            </div>
          </div>
        </form>
    </div>
  )
}

export default ChatBot