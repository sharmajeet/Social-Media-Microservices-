const fs = require('fs');
const pdfParse = require('pdf-parse');
const logger = require('./logger');

async function extractPdf(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        
        // Clean and normalize the text
        let text = data.text;
        
        // Remove excessive whitespace and normalize line breaks
        text = text.replace(/\s+/g, ' ');
        text = text.replace(/(\r\n|\n|\r)/gm, '\n');
        
        logger.info(`Extracted ${text.length} characters from PDF`);
        
        return text;
    } catch (error) {
        logger.error('Error extracting PDF:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

module.exports = extractPdf;