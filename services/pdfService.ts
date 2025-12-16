import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Vite-compatible worker loading - MANUAL COPY METHOD (Most Robust)
// import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// POLYFILL: pdfjs-dist v4+ requires Promise.withResolvers
if (typeof Promise.withResolvers === 'undefined') {
    if (window) {
        // @ts-expect-error Polyfill
        window.Promise.withResolvers = function () {
            let resolve, reject;
            const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
            return { promise, resolve, reject };
        };
    }
}

// Use the manually copied worker in public/
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();

        // Load the document
        const loadingTask = getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        let fullText = '';
        console.log(`📄 PDF loaded: ${pdf.numPages} pages`);

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Extract text items
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += `\n--- Página ${i} ---\n${pageText}\n`;
        }

        const trimmed = fullText.trim();
        if (!trimmed) {
            console.warn('⚠️ PDF text extraction resulted in empty string. It might be an image-only PDF.');
        }

        return trimmed;
    } catch (error: any) {
        console.error('Error parsing PDF:', error);
        // Throw specific error message to be caught by UI
        throw new Error(`Falha ao ler PDF: ${error.message || 'Erro desconhecido'}`);
    }
};
