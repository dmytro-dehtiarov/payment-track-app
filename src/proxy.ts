// Next.js 16 renamed the `middleware` file convention to `proxy`
// (see node_modules/next/dist/docs/.../proxy.md). Route-gating logic itself
// lives in the `authorized` callback in src/auth.ts.
export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
