import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    project_slug: 'anastasia_sych',
    project_name: 'Anastasia Sych',
    domain: 'https://anastasia-sych.vercel.app',
    version: '1.0.0',
    ping_timestamp: new Date().toISOString(),
    pages_count: 4,
    pages: [
      { label: 'Головна', path: '/', type: 'free', url: 'https://anastasia-sych.vercel.app/' },
      { label: 'Консультація', path: '/consultation', type: 'free', url: 'https://anastasia-sych.vercel.app/consultation' },
      { label: 'Діагностика', path: '/diagnostic', type: 'quiz', url: 'https://anastasia-sych.vercel.app/diagnostic' },
      { label: 'Сторінка Подяки', path: '/thank-you', type: 'thank_you', url: 'https://anastasia-sych.vercel.app/thank-you' }
    ]
  });
}
