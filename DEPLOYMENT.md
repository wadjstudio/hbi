# نشر HBI على hbi.wadj.online

## آخر تحديث للخرائط متحقق — 2026-10-16

نُشر المصدر `a99170b` على production/main كإصدار `ada9964a-0ea4-4a22-9f74-2d1fd6a6e27a`: `https://ada9964a.hbi-handball-intelligence.pages.dev`. أضاف خرائط كثافة/نقاط مبنية على المواقع المسجلة، مع أدلة القطاعات ونسب من المواقع المعروفة فقط. نجحت اختبارات الوحدة الـ60 وlint وtypecheck وبناء Next وبناء Pages؛ اجتازت رحلتا Chrome على بناء إنتاج محلي مع بيانات mock معزولة، دون تخفيف اختبارات السلوك أو هندسة الشاشة. أُعيد بناء Pages بالإعداد الحقيقي، وتحقق فحص الهدف من مشروع Supabase والدومين الصحيحين وغياب عنوان/مفتاح mock من ملفات العميل والخادم. طابقت ملفات JS/CSS الـ38 المنشورة الحزمة المحلية وأعادت صفحة الدخول الحالة 200. لا تغيير للقاعدة أو DNS أو R2، ولم يُختبر دخول الحساب الحقيقي المستضاف في هذا التحديث. إيصال النشر في workspace outputs/deployment/SESEN_DENSITY_RELEASE_2026-10-16.md.

## آخر تحديث للهيدر متحقق — 2026-10-16

نُشر المصدر `b9363c4` على production/main كإصدار `48cc8407-62d0-4fa9-bba6-ae2d6995078f`: `https://48cc8407.hbi-handball-intelligence.pages.dev`. أضاف هوية الحساب الفعلية ودور المؤسسة، جرس العمليات المعلقة، العروض المرتبطة بالمباراة، وروابط مشاركة تحفظ الجلسة وزمن المصدر دون رفع الفيديو أو تغيير الوصول. نجحت اختبارات الوحدة الـ58 وlint وTypeScript وبناء Next وPages ورحلتا Chrome؛ طابقت ملفات JS/CSS الـ38 المنشورة الحزمة المحلية وأعادت صفحة الدخول الحالة 200. لم يُختبر دخول الحساب الحقيقي في هذا التحديث ولم تتغير القاعدة أو DNS أو إعدادات R2. إيصال النشر في workspace outputs/deployment/SESEN_HEADER_RELEASE_2026-10-16.md؛ المطابقة الكاملة للمرجع تظل قيد المراجعة.

## آخر تحديث للواجهة متحقق — 2026-10-16

نُشر المصدر `6f1f38b` على production/main كإصدار `3bbb2c3b-96f3-45d6-b296-cea3ef34e328`، وعنوانه الثابت `https://3bbb2c3b.hbi-handball-intelligence.pages.dev`. يجمع تبويبات إحصاءات اللاعبين والفرق والمقارنة والتقارير مع إصلاحات المزامنة المدمجة في PR #2 وحماية التخزين في PR #1. نجحت اختبارات الوحدة الـ55 وlint وبناء Next مع TypeScript وبناء Pages؛ نجحت رحلة الفيديو والعمل دون اتصال والاجتماع بعد الدمج. طابقت ملفات JavaScript/CSS الـ38 المنشورة الحزمة المحلية بالـSHA256 ونوع المحتوى، وأعادت صفحة الدخول على الدومين الحالة 200. لم يُختبر دخول المدرب المستضاف في هذا التحديث، ولم تُطبّق مهاجرات أو تغييرات DNS أو عمليات R2. تظل حالة القاعدة المتحققة حتى 0020 الموضحة أدناه مرجعًا تاريخيًا لذلك النشر. تفاصيل التحقق في VALIDATION.md وإيصال workspace outputs/deployment/SESEN_STATISTICS_RELEASE_2026-10-16.md.

## آخر نشر متحقق — 2026-10-15

نُشرت النسخة `ddde7a6` من فرع الإنتاج `main` بعد دمج PR #1 لتأمين تخزين R2، على مشروع Pages الحالي: `https://0d3d3a05.hbi-handball-intelligence.pages.dev`. اجتازت النسخة typecheck وlint و50 اختبار وحدة وdb:verify، ثم بُنيت بـ`pnpm build:pages` ونُشرت عبر Wrangler Pages. أعاد `https://hbi.wadj.online/login` الحالة 200، وأعاد `/api/r2/sign-read` الحالة 401 دون جلسة. قبل الترقية أثبت CLI وفحص المخطط أن Supabase كان عند `0016` فقط، خلافًا لما ورد سابقًا في الوثائق. طُبّقت `0017`–`0020` بتاريخ 2026-10-15 عبر Supabase CLI المرتبط، وتحقق بعدها سجل `0001`–`0020` وعمود `youtube_video_id` ودوال `0018`/`0019`؛ كان جدول `videos` فارغًا، وقيمة `storage_limits.max_shared_bytes` هي `1073741824`. أي تعديل كود لاحق يحتاج تحققًا ونشرًا منفصلين؛ لا تفترض أن تحديث الوثائق أو نجاح البناء ينشره تلقائيًا.

## المسار المختار — 2026-10-06

Cloudflare Pages advanced mode مع بقاء DNS وشراء الدومين في Spaceship. لا تغيّر nameservers. موقع وادج الحالي مستقل على `wadj-studio.pages.dev` وله `www.wadj.online` فعال؛ حافظ على سجلاته والبريد.

المنطقة في Cloudflare Pending وسجلاتها لا تطابق Spaceship. إعداد Worker Custom Domain القديم في `wrangler.jsonc` اختياري لمناطق Cloudflare الفعالة؛ لا تنشره على الدومين الحالي. `wadj-studio.workers.dev` عنوان حساب Workers، وليس تطبيق وادج.

## الحالة المتحققة

- المصدر على `https://github.com/wadjstudio/hbi`، فرع `main`، وCI للتحقق فقط.
- مشروع Supabase الحالي `tsgecvtldcypsrinthwx` يحتوي سجل المهاجرات `0001`–`0020`، متحققًا عبر Supabase CLI المرتبط بتاريخ 2026-10-15. لا تشغّل fresh-install عليه. تطابق نص SQL المستضاف بالكامل لم يُختبر.
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
pnpm exec wrangler pages deploy --cwd dist/pages --project-name hbi-handball-intelligence --branch main
```

استخدم عنوان `pages.dev` الفعلي الذي يرجعه النشر. اختبر الدخول والمؤسسة وSSR وCSS/JS والتنقل على HTTPS. المشروع والدومين موجودان؛ لا تعِد إنشاء المشروع ولا تغيّر DNS للنشر المعتاد. لا تفعّل نشر Supabase الآلي؛ طبّق المهاجرات المراجعة وفق مسار الترقية أدناه قبل نشر الكود المتوافق.

## ربط السب دومين فقط

أضف `hbi.wadj.online` أولًا في Pages → Custom domains للمشروع العامل. ثم أضف في Spaceship سجل CNAME مستقلًا باسم `hbi` إلى اسم `pages.dev` الفعلي، دون البروتوكول. راجع السجل قبل الحفظ. لا تستخدم `workers.dev` ولا تعدّل `@` أو `www` أو wildcard أو البريد. انتظر Active والشهادة وتحقق من HTTPS والدخول على العنوان النهائي.

في Supabase Auth → URL Configuration اضبط Site URL على `https://hbi.wadj.online` وأضف `/login` عند الحاجة لروابط التأكيد. لا توجد `/auth/callback` أو صفحة استعادة كلمة مرور. المستخدم يدخل أي كلمة مرور بنفسه.

## قاعدة جديدة والترقية

طُبّقت `0017` و`0018` و`0019` من `main` ثم `0020` بتاريخ 2026-10-15 عبر `pnpm exec supabase db push --linked` على hbi Project / `tsgecvtldcypsrinthwx`. مسار SQL اليدوي السابق تحت `outputs/deployment`، بما فيه `HBI_UPGRADE_0017.sql` و`HBI_UPGRADE_0018_0019.sql`، أصبح متجاوزًا لهذا المشروع ولا يُعاد تشغيله. لا تشغّل `HBI_FRESH_INSTALL.sql` على القاعدة الموجودة.

تحقّق دائمًا من حالة المهاجرات عبر CLI، ولا تعتمد على الوثائق لتحديد ما طُبّق. بعد الموافقة على الترقية والنشر، ومن مجلد المصدر المرتبط بالمشروع الصحيح، استخدم المسار المعتاد:

```powershell
pnpm exec supabase migration list --linked
pnpm exec supabase db push --linked --dry-run
pnpm exec supabase db push --linked
pnpm build:pages
pnpm exec wrangler pages deploy --cwd dist/pages --project-name hbi-handball-intelligence --branch main
```

راجع قائمة المهاجرات المعلّقة في dry-run قبل التطبيق، ثم تحقّق من سجل المهاجرات والأعمدة والدوال بعده. يجب أن تجتاز النسخة اختبارات البناء والتطبيق محليًا قبل الترقية؛ ابنِ وانشر Pages مباشرة بعدها لتقليل فترة عدم التوافق. بعد `0020` يتعطل حجز الرفع في الكود القديم الذي يرسل `p_limit`، كما يُرفض تحديث الاكتمال المباشر؛ لذلك يلزم نشر الكود المتوافق فورًا. لا تغيّر DNS أو إعداد النشر الآلي.

لأي مشروع جديد فارغ، طبّق المهاجرات بالترتيب عبر Supabase CLI. للقاعدة الموجودة طبّق الناقص فقط بعد مراجعة السجل والبيانات؛ لا تستخدم hosted `db reset`. SQL/RLS المرجع النهائي، والتحقق المحلي لا يغني عن عزل حسابين حقيقيين وترقية staging.

## الحدود والمشاركة الاختيارية

Zero-Cost ضمن حصص الخطط المجانية. راجع `ZERO_COST_LIMITS.md` وحصص الحساب. وظائف Pages تستخدم حصص Workers؛ قياس CPU وحجم التطبيق مطلوب بعد النشر. لا تُفعّل موارد مدفوعة تلقائيًا.

R2 اختياري. عند استخدامه جهّز bucket/CORS وأسراره في bindings الخادم، دون Git أو ملفات العميل، واختبر الرفع المباشر والحدود والروابط المؤقتة. اختبار R2 الفعلي لم يُنفّذ.

منذ `0020` أصبحت حقول R2 مُدارة عبر دوال قاعدة البيانات والمشغّل `guard_r2_storage`: الحجز عبر `reserve_video_upload(p_video)` دون `p_limit`، والاكتمال عبر `complete_video_upload(p_video)`. الحصة في `public.storage_limits.max_shared_bytes`، وقيمتها المتحققة `1073741824` بايت (1 GiB)؛ لا تُغيّر إلا بـSQL بصفة مالك قاعدة البيانات وبعد الموافقة. أُزيل استخدام `R2_MAX_SHARED_BYTES` من الكود و`.env.example`، ولم يعد يتحكم في الحصة.

مراجع: [Pages advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/)، [DNS خارجي](https://developers.cloudflare.com/pages/configuration/custom-domains/)، [حدود Pages](https://developers.cloudflare.com/pages/platform/limits/).
