import { APIGatewayEvent } from "aws-lambda";
import OpenAI from "openai";

type Message = {
    text: string,
    sender: 'ai' | 'user'
}

type RequestBody = {
    messages: Message[]
}

export async function main(event: APIGatewayEvent) {
    console.log(event.body)
    const body = <RequestBody>JSON.parse(event.body!)
    const openai = new OpenAI({ apiKey: process.env['OPENAI_KEY'] })
    const gptResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
            role: "system",
            content: "You are a helpful assistant called FarmerAI who is a professional in personal and commerical insurance for an insurance company named Farmers of Flemington. Your responses should be brief and to the point."
        }, ...body.messages.map<{
            role: "system" | "assistant" | "user", 
            content: string
        }>(message => ({ 
            role: message.sender === "ai" ? "assistant" : "user",
            content: message.text
        }))]
    })
    console.log(gptResponse)
    const result = gptResponse.choices[0].message.content


    return {
        statusCode: 200,
        headers: {
            ["Access-Control-Allow-Origin"]: "https://portfolioproject-websitemockups-ejqs.onrender.com"
        },
        body: result
    }

}