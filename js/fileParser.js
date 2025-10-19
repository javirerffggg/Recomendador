class FileParser {
    parseFile(content, filename) {
        if (filename.endsWith('.json')) {
            return this.parseJSON(content);
        } else if (filename.endsWith('.csv')) {
            return this.parseCSV(content);
        } else if (filename.endsWith('.m3u')) {
            return this.parseM3U(content);
        } else {
            return this.parseTXT(content);
        }
    }

    parseJSON(content) {
        try {
            const data = JSON.parse(content);
            const tracks = [];
            
            // Formato Spotify
            if (data.tracks && Array.isArray(data.tracks)) {
                data.tracks.forEach(item => {
                    if (item.track) {
                        tracks.push({
                            name: item.track.name,
                            artist: item.track.artists[0]?.name || 'Unknown'
                        });
                    }
                });
            }
            // Formato genérico
            else if (Array.isArray(data)) {
                data.forEach(item => {
                    if (item.name && item.artist) {
                        tracks.push({
                            name: item.name,
                            artist: item.artist
                        });
                    }
                });
            }
            
            return tracks;
        } catch (error) {
            console.error('Error parsing JSON:', error);
            return [];
        }
    }

    parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const tracks = [];
        
        // Skip header if exists
        const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
            const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
            
            if (parts.length >= 2) {
                tracks.push({
                    name: parts[0],
                    artist: parts[1]
                });
            }
        }
        
        return tracks;
    }

    parseM3U(content) {
        const lines = content.split('\n');
        const tracks = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                const info = line.split(',')[1];
                if (info) {
                    const parts = info.split(' - ');
                    if (parts.length >= 2) {
                        tracks.push({
                            artist: parts[0].trim(),
                            name: parts[1].trim()
                        });
                    }
                }
            }
        }
        
        return tracks;
    }

    parseTXT(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const tracks = [];
        
        for (const line of lines) {
            const parts = line.split(' - ');
            if (parts.length >= 2) {
                tracks.push({
                    artist: parts[0].trim(),
                    name: parts[1].trim()
                });
            }
        }
        
        return tracks;
    }
}

export default new FileParser();
