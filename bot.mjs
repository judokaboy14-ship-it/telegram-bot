import { Telegraf, Markup, session } from "telegraf";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;
const ADMIN_ID_2 = process.env.TELEGRAM_ADMIN_ID_2;
const CRYPTO_ADDRESS = process.env.CRYPTO_ADDRESS;

if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required");

const ADMIN_IDS = [ADMIN_ID, ADMIN_ID_2].filter(Boolean);
let BOT_USERNAME = "";

const BRANDS = {
  sativa: {
    name: "Sativa", emoji: "🌿",
    products: [
      { id: "s1", name: "Sour Diesel", priceRange: "100₾ (1გ)", stock: 10, emoji: "🔥" },
      { id: "s2", name: "Jack Herer", priceRange: "90₾ (1გ)", stock: 7, emoji: "⚡" },
    ],
  },
  indica: {
    name: "Indica", emoji: "🍃",
    products: [
      { id: "i1", name: "Granddaddy Purple", priceRange: "85₾ (1გ)", stock: 5, emoji: "💜" },
      { id: "i2", name: "Northern Lights", priceRange: "70₾ (1გ)", stock: 8, emoji: "🌌" },
    ],
  },
  hybrid: {
    name: "Hybrid", emoji: "🌱",
    products: [
      { id: "h1", name: "Gorilla Glue", priceRange: "100₾ (1გ)", stock: 4, emoji: "🦍" },
      { id: "h2", name: "OG Kush", priceRange: "90₾ (1გ)", stock: 9, emoji: "🌊" },
    ],
  },
};

const CITIES = ["თბილისი", "ბათუმი"];

function findProductById(id) {
  for (const brand of Object.values(BRANDS)) {
    const product = brand.products.find((p) => p.id === id);
    if (product) return { brand, product };
  }
  return null;
}

function mainMenuKeyboard() {
  return Markup.keyboard([
    ["🛍️ კატალოგი", "🏙️ ქალაქი"],
    ["💳 გადახდის ინფო", "🏠 მთავარი"],
  ]).resize();
}

function brandsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🌿 Sativa", "brand_sativa"), Markup.button.callback("🍃 Indica", "brand_indica")],
    [Markup.button.callback("🌱 Hybrid", "brand_hybrid")],
    [Markup.button.callback("⬅️ უკან", "back_main")],
  ]);
}

function productKeyboard(brandKey) {
  const brand = BRANDS[brandKey];
  if (!brand) return Markup.inlineKeyboard([]);
  const rows = brand.products.map((p) => [
    Markup.button.callback(`${p.emoji} ${p.name} — ${p.priceRange} | მარაგი: ${p.stock}`, `product_${p.id}`),
  ]);
  rows.push([Markup.button.callback("⬅️ უკან", "back_brands")]);
  return Markup.inlineKeyboard(rows);
}

function cityKeyboard(productId) {
  return Markup.inlineKeyboard([
    ...CITIES.map((city) => [Markup.button.callback(`📍 ${city}`, `city_${city}_${productId}`)]),
    [Markup.button.callback("⬅️ უკან", `back_product_${productId}`)],
  ]);
}

function groupCatalogKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url("🛒 შეკვეთა → პირად ჩატში", `https://t.me/${BOT_USERNAME}?start=order`)],
  ]);
}

function groupWelcomeText() {
  return (
    `🌿 *კეთილი იყოს თქვენი მობრძანება!*\n\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `🌿 *Sativa*\n🔥 Sour Diesel — 100₾ (1გ)\n⚡ Jack Herer — 90₾ (1გ)\n\n` +
    `🍃 *Indica*\n💜 Granddaddy Purple — 85₾ (1გ)\n🌌 Northern Lights — 70₾ (1გ)\n\n` +
    `🌱 *Hybrid*\n🦍 Gorilla Glue — 100₾ (1გ)\n🌊 OG Kush — 90₾ (1გ)\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `💳 გადახდა — კრიპტო (ETH/ERC-20)\n📍 მიწოდება: თბილისი | ბათუმი\n\n` +
    `👇 შეკვეთისთვის დააჭირე ღილაკს:`
  );
}

function welcomeMessage(name) {
  return (
    `👋 გამარჯობა, ${name}!\n\nკეთილი იყოს შენი მობრძანება!\n\n` +
    `შეგიძლია შეიძინო ჩვენგან:\n🌿 Sativa\n🍃 Indica\n🌱 Hybrid\n\n` +
    `გადახდა ხდება კრიპტოვალუტით 💳\n\n👇 აირჩიე მენიუდან:`
  );
}

const adminReplyMap = new Map();
const activeBuyers = new Set();
const bot = new Telegraf(BOT_TOKEN);

bot.use(session({ defaultSession: () => ({}) }));

bot.start(async (ctx) => {
  if (ctx.chat?.type !== "private") {
    await ctx.reply("👋 შეკვეთისთვის გადადი პირად ჩატში 👇",
      Markup.inlineKeyboard([[Markup.button.url("🛒 შეკვეთა", `https://t.me/${BOT_USERNAME}?start=order`)]]));
    return;
  }
  ctx.reply(welcomeMessage(ctx.from?.first_name || "მომხმარებელი"), mainMenuKeyboard());
});

bot.hears("🏠 მთავარი", (ctx) =>
  ctx.reply(welcomeMessage(ctx.from?.first_name || "მომხმარებელი"), mainMenuKeyboard()));

bot.hears("🛍️ კატალოგი", (ctx) =>
  ctx.reply("🛍️ *ბრენდი*\n\nაირჩიე ბრენდი:", { parse_mode: "Markdown", ...brandsKeyboard() }));

bot.hears("🏙️ ქალაქი", (ctx) =>
  ctx.reply(
    `🏙️ *ქალაქები*\n\n📍 *თბილისი* — მიწოდება ხელმისაწვდომია\n📍 *ბათუმი* — მიწოდება ხელმისაწვდომია\n\nშეკვეთის გაფორმებისას ავირჩევ ქალაქს.`,
    { parse_mode: "Markdown", ...mainMenuKeyboard() }
  ));

bot.hears("💳 გადახდის ინფო", (ctx) =>
  ctx.reply(
    `💳 *გადახდის ინფო*\n\nგადახდა ხდება კრიპტოვალუტით (ETH/ERC-20):\n\n\`${CRYPTO_ADDRESS}\`\n\n⚠️ გადახდის შემდეგ გამოგვიგზავნე ტრანზაქციის ჰეში და შეკვეთა დასტურდება.`,
    { parse_mode: "Markdown", ...mainMenuKeyboard() }
  ));

bot.command("catalog", async (ctx) =>
  ctx.reply(groupWelcomeText(), { parse_mode: "Markdown", ...groupCatalogKeyboard() }));

bot.on("new_chat_members", async (ctx) => {
  const newMembers = ctx.message.new_chat_members;
  const botInfo = await bot.telegram.getMe();
  const botJoined = newMembers.some((m) => m.id === botInfo.id);
  if (botJoined) {
    const sent = await ctx.reply(groupWelcomeText(), { parse_mode: "Markdown", ...groupCatalogKeyboard() });
    try { await ctx.pinChatMessage(sent.message_id, { disable_notification: true }); } catch {}
    return;
  }
  for (const member of newMembers) {
    if (member.is_bot) continue;
    const name = member.first_name || "მომხმარებელი";
    await ctx.reply(
      `👋 გამარჯობა, [${name}](tg://user?id=${member.id})!\n\nკეთილი იყოს შენი მობრძანება ჯგუფში! 🎉\n\nშეგიძლია შეიძინო ჩვენგან — დააჭირე ღილაკს:`,
      { parse_mode: "Markdown", ...Markup.inlineKeyboard([[Markup.button.url("🛒 კატალოგი & შეკვეთა", `https://t.me/${BOT_USERNAME}?start=order`)]]) }
    );
  }
});

bot.action("back_main", async (ctx) => { await ctx.answerCbQuery(); await ctx.editMessageText("👇 მთავარი მენიუ — აირჩიე:"); });
bot.action("back_brands", async (ctx) => { await ctx.answerCbQuery(); await ctx.editMessageText("🛍️ ბრენდი\n\nაირჩიე ბრენდი:", { parse_mode: "Markdown", ...brandsKeyboard() }); });

bot.action(/^brand_(.+)$/, async (ctx) => {
  const brand = BRANDS[ctx.match[1]];
  if (!brand) return ctx.answerCbQuery("ბრენდი ვერ მოიძებნა");
  await ctx.answerCbQuery();
  await ctx.editMessageText(`${brand.emoji} *${brand.name}*\n\n👇 აირჩიე:`, { parse_mode: "Markdown", ...productKeyboard(ctx.match[1]) });
});

bot.action(/^product_(.+)$/, async (ctx) => {
  const found = findProductById(ctx.match[1]);
  if (!found) return ctx.answerCbQuery("პროდუქტი ვერ მოიძებნა");
  const { brand, product } = found;
  await ctx.answerCbQuery();
  const stockStatus = product.stock > 5 ? `✅ მარაგშია (${product.stock} ცალი)` : product.stock > 0 ? `⚠️ ცოტა დარჩა (${product.stock} ცალი)` : `❌ ამოიწურა`;
  await ctx.editMessageText(
    `${product.emoji} *${product.name}*\n\n🏷️ ბრენდი: ${brand.emoji} ${brand.name}\n💰 ფასი: *${product.priceRange}*\n📦 ${stockStatus}\n\n📍 *ქალაქი* — სად გნებავს მიწოდება?`,
    { parse_mode: "Markdown", ...cityKeyboard(product.id) }
  );
});

bot.action(/^back_product_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const found = findProductById(ctx.match[1]);
  if (!found) return;
  const brandKey = Object.keys(BRANDS).find((k) => BRANDS[k].products.some((p) => p.id === ctx.match[1]));
  if (!brandKey) return;
  const brand = BRANDS[brandKey];
  await ctx.editMessageText(`${brand.emoji} *${brand.name}*\n\n👇 აირჩიე:`, { parse_mode: "Markdown", ...productKeyboard(brandKey) });
});

bot.action(/^city_(.+)_(.+)$/, async (ctx) => {
  const city = ctx.match[1];
  const productId = ctx.match[2];
  await ctx.answerCbQuery();
  const found = findProductById(productId);
  if (!found) return;
  const { brand, product } = found;
  if (product.stock <= 0) {
    const brandKey = Object.keys(BRANDS).find((k) => BRANDS[k].products.some((p) => p.id === productId)) || "";
    await ctx.editMessageText(`❌ სამწუხაროდ, *${product.name}* ამოიწურა.\n\nსხვა ნივთი სცადე!`, { parse_mode: "Markdown", ...productKeyboard(brandKey) });
    return;
  }
  await ctx.editMessageText(
    `✅ *შეკვეთა გაფორმდა!*\n\n━━━━━━━━━━━━━━━━\n${product.emoji} ${product.name}\n🏷️ ბრენდი: ${brand.emoji} ${brand.name}\n💰 ფასი: *${product.priceRange}*\n📍 ქალაქი: *${city}*\n━━━━━━━━━━━━━━━━\n\n💳 *გადახდა:*\nგადარიცხე ${product.priceRange} (ETH/ERC-20) ამ მისამართზე:\n\n\`${CRYPTO_ADDRESS}\`\n\n⚠️ გადახდის შემდეგ გამოგვიგზავნე ტრანზაქციის ჰეში — შეკვეთა დადასტურდება!`,
    { parse_mode: "Markdown" }
  );
  if (ADMIN_IDS.length > 0) {
    const user = ctx.from;
    const adminMsg = `🔔 *ახალი შეკვეთა!*\n\n👤 ${user?.first_name || "?"} ${user?.last_name || ""}` +
      (user?.username ? ` (@${user.username})` : "") +
      `\n🆔 ID: \`${user?.id}\`\n\n${product.emoji} *${product.name}*\n🏷️ ${brand.emoji} ${brand.name}\n💰 *${product.priceRange}*\n📍 *${city}*\n━━━━━━━━━━━━━━━━\n⏳ გადახდის მოლოდინში...\n\n↩️ _Reply გააკეთე მყიდველთან საუბრისთვის_`;
    const confirmKb = Markup.inlineKeyboard([[Markup.button.callback("✅ შეკვეთა დადასტურდა", `confirm_${user?.id}`)]]);
    for (const adminId of ADMIN_IDS) {
      const sent = await bot.telegram.sendMessage(adminId, adminMsg, { parse_mode: "Markdown", ...confirmKb });
      if (user?.id) adminReplyMap.set(sent.message_id, user.id);
    }
    if (user?.id) activeBuyers.add(user.id);
  }
});

bot.action(/^confirm_(\d+)$/, async (ctx) => {
  const buyerChatId = Number(ctx.match[1]);
  await ctx.answerCbQuery("✅ დადასტურდა!");
  await bot.telegram.sendMessage(buyerChatId, `✅ *შენი შეკვეთა დადასტურდა!*\n\nმალე დაგიკავშირდებიან მიწოდების დეტალებზე.`, { parse_mode: "Markdown" });
  const originalText = ctx.callbackQuery.message && "text" in ctx.callbackQuery.message ? ctx.callbackQuery.message.text : "";
  await ctx.editMessageText(`${originalText}\n\n✅ *შეკვეთა დადასტურდა*`, { parse_mode: "Markdown" });
});

bot.on("message", async (ctx, next) => {
  const msg = ctx.message;
  const fromId = String(ctx.from?.id);
  if (ADMIN_IDS.includes(fromId)) {
    const replyTo = "reply_to_message" in msg ? msg.reply_to_message : undefined;
    if (!replyTo) return next();
    const buyerChatId = adminReplyMap.get(replyTo.message_id);
    if (!buyerChatId) return next();
    const text = "text" in msg ? msg.text : undefined;
    if (!text) return next();
    await bot.telegram.sendMessage(buyerChatId, `📩 *გამყიდველის პასუხი:*\n\n${text}`, { parse_mode: "Markdown" });
    await ctx.reply("✅ შეტყობინება გაიგზავნა მყიდველთან.");
    return;
  }
  const buyerId = ctx.from?.id;
  if (!buyerId || !activeBuyers.has(buyerId)) return next();
  const text = "text" in msg ? msg.text : undefined;
  if (!text) return next();
  if (ADMIN_IDS.length > 0) {
    const user = ctx.from;
    const forwardMsg = `💬 *მყიდველის შეტყობინება:*\n\n👤 ${user?.first_name || "?"} ${user?.last_name || ""}` +
      (user?.username ? ` (@${user.username})` : "") + `\n\n${text}\n\n↩️ _Reply გააკეთე პასუხის გასაგზავნად_`;
    for (const adminId of ADMIN_IDS) {
      const sent = await bot.telegram.sendMessage(adminId, forwardMsg, { parse_mode: "Markdown" });
      adminReplyMap.set(sent.message_id, buyerId);
    }
  }
});

bot.telegram.getMe().then((me) => { BOT_USERNAME = me.username || ""; console.log(`✅ Bot @${BOT_USERNAME} started`); }).catch(() => {});
bot.launch().then(() => console.log("✅ Running 24/7!")).catch((err) => { console.error(err); process.exit(1); });
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
