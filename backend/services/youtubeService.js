const { YoutubeTranscript } = require('youtube-transcript');

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  throw new Error('Invalid YouTube URL. Please provide a valid YouTube video link.');
}

async function getYouTubeTranscript(url) {
  const videoId = extractVideoId(url);
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript available for this video. The video may not have captions.');
    }
    const fullText = transcript.map(t => t.text).join(' ');
    const duration = transcript[transcript.length - 1]?.offset || 0;
    return {
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      transcript: fullText,
      segments: transcript.length,
      duration: Math.round(duration / 1000),
      wordCount: fullText.split(/\s+/).filter(Boolean).length
    };
  } catch (err) {
    if (err.message.includes('Transcript is disabled')) {
      throw new Error('Transcripts are disabled for this video by the creator.');
    }
    throw new Error(`Could not fetch transcript: ${err.message}`);
  }
}

module.exports = { getYouTubeTranscript, extractVideoId };
