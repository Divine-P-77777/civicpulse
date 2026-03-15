export async function exportToPDF(content: string, topic: string, draftType: string) {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

    const pdfDoc = await PDFDocument.create();
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    const margin = 60;
    const pageWidth = 595;
    const pageHeight = 842;
    const textWidth = pageWidth - margin * 2;
    
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // --- Helpers ---
    const drawTextLine = (text: string, font: any, size: number, color = rgb(0.1, 0.1, 0.1), xOffset = 0) => {
        if (y < margin + size) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
        }
        page.drawText(text, { x: margin + xOffset, y, font, size, color });
        y -= (size * 1.4);
    };

    const wrapAndDrawRichText = (text: string, size: number, isTitle = false) => {
        // Simple regex-based markdown parser for a single line/paragraph
        // Identifies bold segments **text**
        const parts: { text: string; bold: boolean }[] = [];
        let remaining = text;
        const boldRegex = /\*\*([^*]+)\*\*/;
        
        while (remaining) {
            const match = boldRegex.exec(remaining);
            if (match) {
                if (match.index > 0) parts.push({ text: remaining.slice(0, match.index), bold: false });
                parts.push({ text: match[1], bold: true });
                remaining = remaining.slice(match.index + match[0].length);
            } else {
                parts.push({ text: remaining, bold: false });
                remaining = '';
            }
        }

        // Wrap logic for rich text is complex, so we'll do a per-word approach if needed, 
        // but for now, we'll keep it paragraph-based and handle simple bolding in lines.
        // Actually, to keep it professional, let's just sanitize and detect bold for now 
        // until we have a full rich text layout engine.
        
        const cleanLine = text.replace(/\*\*([^*]+)\*\*/g, '$1')
                             .replace(/₹/g, 'Rs. ')
                             .replace(/[^\x00-\x7F]/g, char => {
                                 const map: any = { '—': '-', '–': '-', '“': '"', '”': '"', '‘': "'", '’': "'" };
                                 return map[char] || '';
                             });

        const font = isTitle ? timesBold : timesRoman;
        const words = cleanLine.split(' ');
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (font.widthOfTextAtSize(testLine, size) > textWidth) {
                drawTextLine(currentLine, font, size);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) drawTextLine(currentLine, font, size);
    };

    // --- 🖋️ Professional Page Header ---
    // Subtle Branding
    page.drawText('CIVICPULSE AI LEGAL DRAFTING', {
        x: margin,
        y: pageHeight - 35,
        font: timesBold,
        size: 8,
        color: rgb(0.6, 0.6, 0.6)
    });
    
    page.drawLine({
        start: { x: margin, y: pageHeight - 42 },
        end: { x: pageWidth - margin, y: pageHeight - 42 },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.9)
    });

    y = pageHeight - 80;

    // --- 🏛️ Document Specific Layouts ---
    if (draftType === 'legal_notice') {
        // Notice: Formal Centered Banner
        const bannerText = 'LEGAL NOTICE';
        const bannerWidth = timesBold.widthOfTextAtSize(bannerText, 22);
        page.drawText(bannerText, { 
            x: (pageWidth - bannerWidth) / 2, 
            y, 
            font: timesBold, 
            size: 22, 
            color: rgb(0.1, 0.2, 0.5) 
        });
        y -= 40;
    } else if (draftType === 'complaint') {
        // Complaint: Heavy Left-Aligned
        page.drawText('FORMAL COMPLAINT', { 
            x: margin, 
            y, 
            font: timesBold, 
            size: 24, 
            color: rgb(0, 0, 0) 
        });
        y -= 40;
    } else {
        // Generic Header
        const typeLabel = draftType.replace('_', ' ').toUpperCase();
        page.drawText(typeLabel, { x: margin, y, font: timesBold, size: 20, color: rgb(0.2, 0.2, 0.2) });
        y -= 35;
    }

    // --- 📌 Topic Section ---
    const sanitizedTopic = topic.replace(/₹/g, 'Rs. ').replace(/\n/g, ' ');
    page.drawText('RE: ', { x: margin, y, font: timesBold, size: 11, color: rgb(0.4, 0.4, 0.4) });
    
    // Wrap topic
    const topicWords = sanitizedTopic.split(' ');
    let currentTopicLine = '';
    for (const word of topicWords) {
        const testLine = currentTopicLine ? `${currentTopicLine} ${word}` : word;
        if (timesBold.widthOfTextAtSize(testLine, 11) > textWidth - 25) {
            page.drawText(currentTopicLine, { x: margin + 25, y, font: timesBold, size: 11, color: rgb(0.2, 0.2, 0.2) });
            y -= 14;
            currentTopicLine = word;
        } else {
            currentTopicLine = testLine;
        }
    }
    if (currentTopicLine) {
        page.drawText(currentTopicLine, { x: margin + 25, y, font: timesBold, size: 11, color: rgb(0.2, 0.2, 0.2) });
        y -= 25;
    }

    page.drawLine({
        start: { x: margin, y },
        end: { x: margin + 100, y },
        thickness: 2,
        color: rgb(0.16, 0.42, 0.94)
    });
    y -= 30;

    // --- 📝 Body Content ---
    const paragraphs = content.split('\n');
    for (const para of paragraphs) {
        if (!para.trim()) {
            y -= 10;
            continue;
        }

        // Detect Markdown Headers
        if (para.startsWith('###')) {
            y -= 10;
            wrapAndDrawRichText(para.replace('###', '').trim(), 13, true);
            y -= 5;
        } else if (para.startsWith('##')) {
            y -= 15;
            wrapAndDrawRichText(para.replace('##', '').trim(), 15, true);
            y -= 8;
        } else if (para.startsWith('#')) {
            y -= 20;
            wrapAndDrawRichText(para.replace('#', '').trim(), 18, true);
            y -= 10;
        } else if (para.startsWith('- ') || para.startsWith('* ')) {
            // Simple List Item
            wrapAndDrawRichText(para, 11);
        } else {
            // Normal Paragraph
            wrapAndDrawRichText(para, 11);
            y -= 8; // Extra paragraph spacing
        }
    }

    // --- 📄 Professional Footer (Page Numbers) ---
    const pages = pdfDoc.getPages();
    pages.forEach((p, i) => {
        p.drawText(`Page ${i + 1} of ${pages.length}`, {
            x: pageWidth / 2 - 20,
            y: 30,
            font: timesRoman,
            size: 9,
            color: rgb(0.5, 0.5, 0.5)
        });
        
        p.drawText('This document is an AI-generated draft. Please review with legal counsel.', {
            x: margin,
            y: 20,
            font: timesItalic,
            size: 7,
            color: rgb(0.7, 0.7, 0.7)
        });
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.slice(0, 30).replace(/\s+/g, '_')}_CivicPulse.pdf`;
    a.click();
    URL.revokeObjectURL(url);
}
