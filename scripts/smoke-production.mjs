const baseUrl = (process.env.SMOKE_BASE_URL ?? "https://shawtradersev.com").replace(/\/+$/, "");
const paths = ["/", "/shop", "/contact"];

for (const path of paths) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Production smoke check failed: ${path} returned ${response.status}`);
  }
  const body = await response.text();
  if (body.includes("This page didn't load")) {
    throw new Error(`Production smoke check failed: ${path} returned the server error page`);
  }
  console.log(`${path} ${response.status}`);
}