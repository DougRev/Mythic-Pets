// src/middleware.ts
import { NextResponse } from 'next/server';
import { withPWA } from "next-pwa-pack/dist/hoc/withPWA";

function originalMiddleware(request: any) {
  // ...your logic
  return NextResponse.next();
}

export default withPWA(originalMiddleware, {
  revalidationSecret: process.env.REVALIDATION_SECRET!,
  sseEndpoint: "/api/pwa/cache-events",
  webhookPath: "/api/pwa/revalidate",
});

export const config = {
  matcher: ["/", "/(ru|en)/:path*", "/api/pwa/:path*"],
};
