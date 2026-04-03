// src/utils/date.utils.js
export class DateUtils {
    static generateTimestampId() {
      const now = new Date();
      return {
        seqNr: now.toISOString().replace(/[-:.]/g, '').slice(0, 12),
        uniqueId: `${now.getFullYear().toString().slice(2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`,
        generationTime: new Date(now.getTime() - 10 * 60 * 1000).toISOString().slice(0, 19) + 'Z',
        expirationTime: new Date(now.getTime() + 10 * 60 * 1000).toISOString().slice(0, 19) + 'Z'
      };
    }
  
    static formatDateForAFIP(date) {
      return date.toISOString().slice(0, 19) + 'Z';
    }

    
  }