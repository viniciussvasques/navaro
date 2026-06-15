import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Use Docker service name for server-side fetch
  const backendUrl = process.env.BACKEND_URL || 'http://dunnaa-api:8000';
  const streamUrl = `${backendUrl}/api/v1/admin/logs/stream`;
  
  // Get cookies from request
  const cookies = request.headers.get('cookie') || '';
  
  try {
    // Forward request to backend
    const response = await fetch(streamUrl, {
      headers: {
        'Cookie': cookies,
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to connect to log stream' }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Return the streaming response
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Error proxying log stream:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
