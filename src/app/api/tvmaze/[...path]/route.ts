import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.toString();
  
  const tvmazePath = path.join('/');
  
  const url = `https://api.tvmaze.com/${tvmazePath}${query ? `?${query}` : ''}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch from TVMaze' }, { status: 500 });
  }
}
