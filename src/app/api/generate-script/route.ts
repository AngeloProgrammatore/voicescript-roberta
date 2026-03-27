import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { text, duration, language } = await req.json();

    if (!text || !duration || !language) {
      return NextResponse.json(
        { error: "Parametri mancanti: testo, durata e lingua sono obbligatori" },
        { status: 400 }
      );
    }
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { text, duration, language } = await req.json();

    if (!text || !duration || !language) {
      return NextResponse.json(
        { error: "Parametri mancanti: testo, durata e lingua sono obbligatori" },
        { status: 400 }
      );
    }

    const durationLabel = duration === "2" ? "2 minuti (formato Instagram Reels)" : "10 minuti (formato YouTube)";

    const languageMap: Record<string, string> = {
      it: "italiano",
      en: "inglese",
      pt: "portoghese brasiliano",
    };
    const langName = languageMap[language] || "italiano";

    const ctaBlock = language === "it"
      ? "Ma prima di continuare ti invito ad iscriverti al canale e lasciare un commento per essere sempre aggiornato su questo e tanti altri argomenti inerenti alla tua salute."
      : language === "en"
      ? "But before we continue, I invite you to subscribe to the channel and leave a comment to stay updated on this and many other topics related to your health."
      : "Mas antes de continuar, te convido a se inscrever no canal e deixar um comentario para ficar sempre atualizado sobre este e muitos outros assuntos relacionados a sua saude.";

    const prompt = `Usando il testo seguente (trascritto da un messaggio vocale), crea uno script video della durata di ${durationLabel} in lingua ${langName}.

ISTRUZIONI IMPORTANTI:
- Lo script deve essere SOLO TESTUALE, senza indicazioni di sceneggiatura (niente "SCENA 1", "INQUADRATURA", "CUT TO", ecc.)
- Mantieni il tone of voice originale dell'autore
- Preserva le parole chiave e i concetti principali
- Adatta il testo per renderlo fluido e naturale come script parlato per video
- ${duration === "2" ? "Sintetizza e condensa il contenuto per stare in 2 minuti (~300 parole)" : "Espandi e approfondisci il contenuto per riempire 10 minuti (~1500 parole)"}
- Il risultato deve essere un testo continuo, pronto per essere letto davanti alla camera
- Non aggiungere introduzioni tipo "Ecco lo script" o commenti tuoi — fornisci direttamente lo script
- FORMATTAZIONE: usa paragrafi ben separati, frasi chiare e pulite, facili da leggere. Ogni concetto deve avere il suo paragrafo
- STRUTTURA OBBLIGATORIA: dopo il paragrafo introduttivo dello script, DEVI inserire ESATTAMENTE questo blocco (senza modificarlo): "${ctaBlock}"
  Poi continua con il resto dello script.

TESTO TRASCRITTO:
${text}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const scriptContent =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ script: scriptContent });
  } catch (error: unknown) {
    console.error("Script generation error:", error);
    const message = error instanceof Error ? error.message : "Errore nella generazione dello script";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
