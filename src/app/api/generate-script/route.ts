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

    const durationLabel = duration === "2" ? "2 minuti (formato Instagram Reels)" : "10 minuti (formato YouTube)";

    const languageMap: Record<string, string> = {
      it: "italiano",
      en: "inglese",
      pt: "portoghese brasiliano",
    };
    const langName = languageMap[language] || "italiano";

    const ctaMap: Record<string, string> = {
      it: "Ma prima di continuare ti invito ad iscriverti al canale e lasciare un commento per essere sempre aggiornato su questo e tanti altri argomenti inerenti alla tua salute.",
      en: "But before we continue, I invite you to subscribe to the channel and leave a comment to stay updated on this and many other topics related to your health.",
      pt: "Mas antes de continuar, te convido a se inscrever no canal e deixar um comentario para ficar sempre atualizado sobre este e muitos outros assuntos relacionados a sua saude.",
    };
    const ctaBlock = ctaMap[language] || ctaMap.it;

    const adaptInstr = duration === "2"
      ? "Sintetizza e condensa il contenuto per stare in 2 minuti (~300 parole)"
      : "Espandi e approfondisci il contenuto per riempire 10 minuti (~1500 parole)";

    const prompt = "Usando il testo seguente (trascritto da un messaggio vocale), crea uno script video della durata di " + durationLabel + " in lingua " + langName + ".\n\n" +
      "ISTRUZIONI IMPORTANTI:\n" +
      "- TITOLO: sulla primissima riga scrivi SOLO un titolo breve e accattivante per il video (senza virgolette, senza prefissi come TITOLO:). Poi vai a capo due volte e inizia lo script.\n" +
      "- Lo script deve essere SOLO TESTUALE, senza indicazioni di sceneggiatura (niente SCENA 1, INQUADRATURA, CUT TO, ecc.)\n" +
      "- Mantieni il tone of voice originale dell'autore\n" +
      "- Preserva le parole chiave e i concetti principali\n" +
      "- Adatta il testo per renderlo fluido e naturale come script parlato per video\n" +
      "- " + adaptInstr + "\n" +
      "- Il risultato deve essere un testo continuo, pronto per essere letto davanti alla camera\n" +
      "- Non aggiungere introduzioni tipo Ecco lo script o commenti tuoi - fornisci direttamente il titolo e lo script\n" +
      "- FORMATTAZIONE: usa paragrafi ben separati, frasi chiare e pulite, facili da leggere. Ogni concetto deve avere il suo paragrafo\n" +
      "- STRUTTURA OBBLIGATORIA: dopo il paragrafo introduttivo dello script, DEVI inserire ESATTAMENTE questo blocco (senza modificarlo): " + ctaBlock + "\n" +
      "  Poi continua con il resto dello script.\n\n" +
      "TESTO TRASCRITTO:\n" + text;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const fullText = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract title from first line
    const lines = fullText.split("\n");
    const titleLine = lines[0] ? lines[0].trim() : "";
    let bodyStart = 1;
    while (bodyStart < lines.length && lines[bodyStart].trim() === "") {
      bodyStart++;
    }
    const scriptContent = lines.slice(bodyStart).join("\n");

    return NextResponse.json({ script: scriptContent, title: titleLine });
  } catch (error: unknown) {
    console.error("Script generation error:", error);
    const msg = error instanceof Error ? error.message : "Errore nella generazione dello script";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
