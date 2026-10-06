# نشر HBI على hbi.wadj.online

## المسار المختار — 2026-10-06

Cloudflare Pages advanced mode مع بقاء DNS وشراء الدومين في Spaceship. لا تغيّر nameservers. موقع وادج الحالي مستقل على `wadj-studio.pages.dev` وله `www.wadj.online` فعال؛ حافظ على سجلاته والبريد.

المنطقة في Cloudflare Pending وسجلاتها لا تطابق Spaceship. إعداد Worker Custom Domain القديم في `wrangler.jsonc` اختياري لمناطق Cloudflare الفعالة؛ لا تنشره على الدومين الحالي. `wadj-studio.workers.dev` عنوان حساب Workers، وليس تطبيق وادج.

## الحالة المتحققة

- المصدر على `https://github.com/wadjstudio/hbi`، فرع `main`، وCI للتحقق فقط.
- مشروع Supabase الحالي يحتوي سجل المهاجرات `0001`–`0016` والجداول. لا تشغّل fresh-install عليه. تطابق نص SQL المستضاف بالكامل لم يُختبر.
- ربط Supabase بالريبو متحقق، مجلد العمل `.`، Deploy to production وAutomatic branching متوقفان.
- نجح دخول أول حساب مدرب وإنشاء مؤسسة HBI، بدور owner وافق عليه المستخدم، واستعادة المؤسسة بعد تحميل الصفحة.
- نجح اختبار Pages المحلي لوحدة خادم واحدة: HTTP 200 لصفحة `/overview` وCSS/JavaScript، وتحميل مؤسسة HBI الحقيقية في Chrome دون أخطاء console. لا يثبت ذلك CPU/quotas أو تشغيل الدومين المنشور.
- بعد موافقة صريحة على `pages:write` وحفظ التفويض المشفّر، أُنشئ مشروع Pages مستقل ونُشر بنجاح: `https://hbi-handball-intelligence.pages.dev`، deployment `237b15bf-2391-4110-8a95-dbaa90eabc72`. فحص HTTPS اجتاز SSR وملفات البناء الثمانية. أدخل المستخدم كلمة المرور بنفسه؛ ظهر حسابه ومؤسسة HBI في Chrome واستمر الدخول بعد إعادة التحميل.
- اختير Custom domains → My DNS provider، وحُفظ `CNAME hbi → hbi-handball-intelligence.pages.dev` في Spaceship بمهلة TTL 30 دقيقة. السجلات السابقة وnameservers بقيت كما هي. بعد Check DNS records أصبح الدومين Active وSSL enabled؛ فحص `https://hbi.wadj.online` اجتاز SSR وملفات العميل الثمانية، ودخل المدرب إلى مؤسسة HBI على الدومين النهائي دون أخطاء console ملحوظة.

## البناء والتجربة

استخدم Node 24 وpnpm 10.30.3. انسخ `.env.example` إلى `.env.local` واضبط القيم العامة:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL=https://hbi.wadj.online
NEXT_PUBLIC_APP_NAME=HBI
HBI_AI_ENABLED=false
```

لا تستخدم secret/service_role في متغير عام. Vite يمرّر فقط قيمتي Supabase العامتين إلى إعداد خادم Worker. بناء Pages يستخدم قائمة محددة من المتغيرات العامة ويترك AI معطلًا؛ لا ينسخ أسرار R2.

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm db:verify
pnpm build
pnpm build:pages
pnpm preview:pages
```

`build:pages` يبني vinext ثم يجمع الخادم إلى `dist/pages/_worker.js` باستخدام esbuild الموجود مع Wrangler، وينسخ ملفات العميل. `_routes.json` يستثني الملفات الثابتة من SSR. `dist/pages/wrangler.json` إعداد مولد، يُستبعد من Git وZIP. البناء لا يرفع شيئًا.

بعد معاينة `/login` سجّل الدخول بالحساب الموجود وتحقق من المؤسسة والتنقل. لا تنشئ مؤسسة أخرى للاختبار. لا يُضمّن أي فيديو محلي في النشر.

## النشر بعد تفويض Pages

تفويض `pages:write` اعتُمد صراحةً، وقد يشمل مشروعات Pages الأخرى في الحساب. المشروع المستقل موجود؛ لا تعِد إنشاءه. لإعادة نشر نسخة جديدة ارفع `dist/pages`؛ لا ترفع `dist/client` وحده ولا تنشر إعداد Worker Custom Domain.

بعد اعتماد اسم المشروع والحساب الصحيح، من مجلد المصدر:

```powershell
pnpm exec wrangler pages project create hbi-handball-intelligence --production-branch main
pnpm exec wrangler pages deploy --cwd dist/pages --project-name hbi-handball-intelligence --branch main
```

استخدم عنوان `pages.dev` الفعلي الذي يرجعه النشر. اختبر الدخول والمؤسسة وSSR وCSS/JS والتنقل على HTTPS قبل تغيير DNS. لا يفترض الدليل أن الاسم متاح أو أن المشروع أُنشئ. لا تفعّل نشر Supabase الآلي أو تطبيق المهاجرات أثناء ذلك.

## ربط السب دومين فقط

أضف `hbi.wadj.online` أولًا في Pages → Custom domains للمشروع العامل. ثم أضف في Spaceship سجل CNAME مستقلًا باسم `hbi` إلى اسم `pages.dev` الفعلي، دون البروتوكول. راجع السجل قبل الحفظ. لا تستخدم `workers.dev` ولا تعدّل `@` أو `www` أو wildcard أو البريد. انتظر Active والشهادة وتحقق من HTTPS والدخول على العنوان النهائي.

في Supabase Auth → URL Configuration اضبط Site URL على `https://hbi.wadj.online` وأضف `/login` عند الحاجة لروابط التأكيد. لا توجد `/auth/callback` أو صفحة استعادة كلمة مرور. المستخدم يدخل أي كلمة مرور بنفسه.

## قاعدة جديدة والترقية

ترقية 0017–0019 والنشر مصرح بهما في هذه المحادثة. حتى 7 أكتوبر لم تُنفّذ الترقية: اتصال التحكم في Chrome يفشل بتحميل request-header policy، وSupabase CLI غير مرتبط بهذا المشروع. الملفات الجاهزة تحت outputs/deployment: شغّل HBI_UPGRADE_0017.sql وحده أولًا ليُلتزم enum، ثم HBI_UPGRADE_0018_0019.sql. جرى اختبار النصين كما سيُلصقان مع سجل المهاجرات في PostgreSQL/WASM والتحقق من رفض إعادة التنفيذ. تأكد من hbi Project / tsgecvtldcypsrinthwx قبل التنفيذ، وافحص سجل 0001–0019 والأعمدة والقيود بعدها. لا تشغّل HBI_FRESH_INSTALL.sql على القاعدة الموجودة. انشر الحزمة الجديدة بعد نجاح الترقية؛ لا تغيّر DNS أو إعداد النشر الآلي.

لأي مشروع جديد فارغ، طبّق المهاجرات بالترتيب عبر Supabase CLI. للقاعدة الموجودة طبّق الناقص فقط بعد مراجعة السجل والبيانات؛ لا تستخدم hosted `db reset`. SQL/RLS المرجع النهائي، والتحقق المحلي لا يغني عن عزل حسابين حقيقيين وترقية staging.

## الحدود والمشاركة الاختيارية

Zero-Cost ضمن حصص الخطط المجانية. راجع `ZERO_COST_LIMITS.md` وحصص الحساب. وظائف Pages تستخدم حصص Workers؛ قياس CPU وحجم التطبيق مطلوب بعد النشر. لا تُفعّل موارد مدفوعة تلقائيًا.

R2 اختياري. عند استخدامه جهّز bucket/CORS وأسراره في bindings الخادم، دون Git أو ملفات العميل، واختبر الرفع المباشر والحدود والروابط المؤقتة. اختبار R2 الفعلي لم يُنفّذ.

مراجع: [Pages advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/)، [DNS خارجي](https://developers.cloudflare.com/pages/configuration/custom-domains/)، [حدود Pages](https://developers.cloudflare.com/pages/platform/limits/).
