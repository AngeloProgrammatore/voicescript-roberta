import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Whisper has a 25MB limit per request. For longer audio we chunk it.
const MAX_CHUNK_SIZE = 24 * 1024 * 1024; // 24MB to be safe

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "Nessun file audio ricevuto" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const totalSize = arrayBuffer.byteLength;

    // If file is small enough, transcribe directly
    if (totalSize <= MAX_CHUNK_SIZE) {
      const ext = (audioFile.type && audioFile.type.includes("mp4")) ? "audio.mp4" : "audio.webm";
        const file = new File([arrayBuffer], ext, { type: audioFile.type || "audio/mp4" });
      const transcription = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: file,
        response_format: "text",
      });

      return NextResponse.json({ text: transcription });
    }

    // For larger files, we split into chunks and transcribe each
    const chunks: ArrayBuffer[] = [];
    let offset = 0;
    while (offset < totalSize) {
      const end = Math.min(offset + MAX_CHUNK_SIZE, totalSize);
      chunks.push(arrayBuffer.slice(offset, end));
      offset = end;
    }

    const transcriptions = await Promise.all(
      chunks.map(async (chunk, i) => {
        const chunkExt = (audioFile.type && audioFile.type.includes("mp4")) ? ".mp4" : ".webm";
            const file = new File([chunk], "audio_part_" + i + chunkExt, {
          type: audioFile.type || "audio/mp4",
        });
        const result = await openai.audio.transcriptions.create({
          model: "whisper-1",
          file: file,
          response_format: "text",
        });
        return result;
      })
    );

    const fullText = transcriptions.join(" ");
    return NextResponse.json({ text: fullText });
  } catch (error: unknown) {
    console.error("Transcription error:", error);
    const message = error instanceof Error ? error.message : "Errore nella trascrizione";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
