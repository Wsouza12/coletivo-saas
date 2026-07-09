const fs = require('fs');

function fixFile(file, replacer) {
  let content = fs.readFileSync(file, 'utf8');
  content = replacer(content);
  fs.writeFileSync(file, content);
}

// 1. app/api/admin/atacado/whatsapp/fixar-tutorial/route.ts
fixFile('app/api/admin/atacado/whatsapp/fixar-tutorial/route.ts', c => {
  c = c.replace(
    'function getEvolutionConfig() {\n  const baseUrl = process.env.EVOLUTION_API_URL?.replace(/\\/$/, "");\n  const instance = process.env.EVOLUTION_INSTANCE;\n  const apiKey = process.env.EVOLUTION_API_KEY;\n  if (!baseUrl || !instance || !apiKey) return null;\n  return { baseUrl, instance, apiKey };\n}',
    'import { getConfig as getEvolutionConfig } from "@/lib/evolution";'
  );
  c = c.replace('const config = getEvolutionConfig();', 'const config = await getEvolutionConfig();');
  return c;
});

// 2. app/api/admin/evolution/configurar-webhook/route.ts
fixFile('app/api/admin/evolution/configurar-webhook/route.ts', c => {
  if (!c.includes('import { getConfig }')) {
    c = c.replace('import { NextResponse } from "next/server";', 'import { NextResponse } from "next/server";\nimport { getConfig } from "@/lib/evolution";');
  }
  c = c.replace('const baseUrl = process.env.EVOLUTION_API_URL;\n  const instance = process.env.EVOLUTION_INSTANCE;\n  const apiKey = process.env.EVOLUTION_API_KEY;', 'const config = await getConfig();\n  if (!config) return NextResponse.json({ error: { message: "API não configurada" } }, { status: 422 });\n  const { baseUrl, instance, apiKey } = config;');
  return c;
});

// 3. app/api/admin/evolution/diagnostico/route.ts
fixFile('app/api/admin/evolution/diagnostico/route.ts', c => {
  if (!c.includes('import { getConfig }')) {
    c = c.replace('import { NextResponse } from "next/server";', 'import { NextResponse } from "next/server";\nimport { getConfig } from "@/lib/evolution";');
  }
  c = c.replace('const baseUrl = process.env.EVOLUTION_API_URL?.replace(/\\/$/, "");\n  const instance = process.env.EVOLUTION_INSTANCE;\n  const apiKey = process.env.EVOLUTION_API_KEY;\n\n  if (!baseUrl || !instance || !apiKey) {', 'const config = await getConfig();\n  if (!config) {\n    return NextResponse.json({ ok: false, error: "Credenciais da Evolution não configuradas no painel" });\n  }\n  const { baseUrl, instance, apiKey } = config;\n\n  if (false) {');
  return c;
});

// 4. app/api/webhooks/evolution/route.ts
fixFile('app/api/webhooks/evolution/route.ts', c => {
  if (!c.includes('import { getConfig }')) {
    c = c.replace('import { NextResponse } from "next/server";', 'import { NextResponse } from "next/server";\nimport { getConfig } from "@/lib/evolution";');
  }
  c = c.replace('const res = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {\n            method: "POST",\n            headers: { apikey: process.env.EVOLUTION_API_KEY as string, "Content-Type": "application/json" },', 'const config = await getConfig();\n          if (!config) return;\n          const res = await fetch(`${config.baseUrl}/message/sendText/${config.instance}`, {\n            method: "POST",\n            headers: { apikey: config.apiKey, "Content-Type": "application/json" },');
  return c;
});

// 5. lib/notificacoes.ts
fixFile('lib/notificacoes.ts', c => {
  if (!c.includes('import { getConfig }')) {
    c = c.replace('import { prisma } from "./prisma";', 'import { prisma } from "./prisma";\nimport { getConfig } from "./evolution";');
  }
  c = c.replace('if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_INSTANCE || !process.env.EVOLUTION_API_KEY) {\n    console.warn("Evolution API não configurada, ignorando notificação do moderador.");\n    return;\n  }', 'const config = await getConfig();\n  if (!config) {\n    console.warn("Evolution API não configurada, ignorando notificação do moderador.");\n    return;\n  }');
  c = c.replace('await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`,', 'await fetch(`${config.baseUrl}/message/sendText/${config.instance}`,');
  c = c.replace('apikey: process.env.EVOLUTION_API_KEY', 'apikey: config.apiKey');
  return c;
});
