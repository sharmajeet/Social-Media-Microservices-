const mammoth = require('mammoth');
const logger = require('./logger');

async function extractDocx(filePath) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        
        let text = result.value;
        
        // Clean and normalize the text
        text = text.replace(/\s+/g, ' ');
        text = text.replace(/(\r\n|\n|\r)/gm, '\n');
        
        if (result.messages.length > 0) {
            logger.warn('Mammoth warnings:', result.messages);
        }
        
        logger.info(`Extracted ${text.length} characters from DOCX`);
        
        return text;
    } catch (error) {
        logger.error('Error extracting DOCX:', error);
        throw new Error('Failed to extract text from DOCX');
    }
}

module.exports = extractDocx;