# نشر HBI على hbi.wadj.online

العنوان المستهدف: `https://hbi.wadj.online`. الإعداد موجود في `wrangler.jsonc` كـWorker Custom Domain، دون تغيير بنية التطبيق أو رفع فيديوهات المستخدم. هذه النسخة تجهّز النشر؛ لا تعني أن الموقع أصبح منشورًا.

## الحالة الحالية — 2026-10-04

- تأكدت من تبويبي Chrome الفعليين: موقع وادج هو Cloudflare Pages باسم `wadj-studio` وعنوانه `wadj-studio.pages.dev`، وليس Worker. الدومين `www.wadj.online` حالته Active وSSL enabled في صفحة Custom domains.
- لوحة Spaceship تؤكد بقاء `launch1.spaceship.net` و`launch2.spaceship.net`. سجل `www` هو CNAME إلى `wadj-studio.pages.dev`؛ سجلا `@` و`*` ضمن مجموعة URL Redirect هما A إلى `15.197.162.184`. هذا يفسّر نتيجة فحص `hbi` عبر wildcard الحالي، ولا يوجد سجل مستقل له في القائمة المقروءة.
- `wadj-studio.workers.dev` عنوان حساب Workers، وليس رابط تطبيق وادج نفسه. قائمة Workers فارغة مع وجود مشروع Pages المذكور.
- ظهر لاحقًا مشروع Supabase جديد باسم `hbi Project` في بروفايل Chrome الآخر، بمرجع `tsgecvtldcypsrinthwx` وعلى الخطة المجانية. إعداد الاتصال العام موجود في `.env.local` المحلي فقط؛ لا توجد مفاتيح سرية في الحزمة.
- حزمة التثبيت الجديدة تجمع المهاجرات الـ16 في transaction واحدة وتكتب سجل `supabase_migrations.schema_migrations` بالنص الأصلي لكل مهاجرة. اختُبرت محليًا: 42 جدولًا، تطابق كامل للمهاجرات والسجل، ورفض إعادة تشغيلها على قاعدة غير فارغة دون فقد بيانات. حزمة SQL جاهزة في محرر المشروع؛ لم تُنفذ لأن المراجعة التلقائية طلبت موافقة صريحة على تعديل القاعدة المستضافة.
- لم تُعدَّل سجلات DNS أو حسابات الاستضافة، ولم يُنشر التطبيق.

## 1. اختيار ربط HBI مع الحفاظ على إعداد وادج

ربط وادج الحالي يعمل على Pages باستخدام CNAME خارجي؛ لا يتطلب تغيير nameservers لهذا السب دومين. إعداد HBI الحالي مختلف: vinext/Cloudflare Workers مع مسارات وخدمات خادم، وليس حزمة Pages جاهزة. لا ترفع dist/client وحده إلى Pages وتعتبر التطبيق كاملًا، ولا تربط CNAME مباشرةً بـworkers.dev باعتباره بديلًا لإعداد Worker Custom Domain.

إذا كان إبقاء nameservers لدى Spaceship شرطًا، يلزم أولًا تنفيذ والتحقق من مسار استضافة متوافق مع DNS الخارجي قبل إعداد سجل hbi. إذا اختير مسار Worker Custom Domain الحالي، تتطلب الخطوات التالية تفعيل منطقة Cloudflare بعد مراجعة كل سجلات الموقع والبريد. لم يُختر أو يُنفّذ انتقال DNS بعد. يمكن أن تظل ملكية الدومين وخدمة SpaceMail لدى Spaceship مع إدارة DNS عند Cloudflare؛ سجلات البريد الفعلية يجب أن تُحفظ وفق دليل Spaceship.

جُرّب Pages advanced mode محليًا كمسار للإبقاء على DNS الخارجي. نقل وحدات vinext إلى مجلد `_worker.js` واجه خطأ في مرجع الخادم `../index.js`. تجميعها في وحدة واحدة نجح، لكن اختبار طلب `/login` انتهى بمهلة دون استجابة؛ لذلك لم يُعتمد هذا المسار ولم يُنشر. نجاح تجميع Pages وحده لا يثبت عمل المصادقة أو تشغيل التطبيق. يتطلب ربط subdomain خارجي إضافة الدومين أولًا إلى مشروع Pages العامل ثم CNAME إلى عنوانه الفعلي، وفق دليل Cloudflare؛ لا تخمّن اسم مشروع أو عنوان نشر.

افتح منطقة `wadj.online` في Cloudflare وتحقق من حالتها وnameservers المعينة لها. إن كانت Pending، راجع أولًا أن سجلات الموقع والبريد الحالية (A/AAAA/CNAME/MX/TXT) منسوخة بشكل صحيح. بعد ذلك يستبدل مالك الدومين الـnameservers لدى المسجل بالقيم التي يعرضها Cloudflare لهذه المنطقة تحديدًا؛ لا تخمّن أسماءها. اتبع خطوات DNSSEC التي تناسب الحالة الفعلية كما يوضح الدليل الرسمي.

انتظر حالة Active وتحقق من تفويض DNS. لا يلزم نقل تسجيل الدومين من شركة الشراء. لاحقًا ينشئ ربط Worker Custom Domain سجل DNS وشهادة TLS؛ لا تضف CNAME يدويًا إلى workers.dev. عالج فقط تعارض السجل الخاص بـ`hbi` إن وُجد بعد تحديد استخدامه، وحافظ على سجلات الدومين الأصلي والبريد.

## 2. إنشاء قاعدة Supabase

أنشئ مشروعًا باسم HBI في حسابك، واختر Free دون تفعيل سعة مدفوعة. أدخل كلمة مرور قاعدة البيانات بنفسك واحتفظ بها في مدير كلمات المرور. انسخ Project URL وPublishable key من إعدادات المشروع؛ هاتان قيمتا الاتصال العامتان اللتان يحتاجهما التطبيق. لا تستخدم service_role أو Secret key في متغير NEXT_PUBLIC.

للمشروع الحالي أُنجز الإنشاء بواسطة المستخدم. التطبيق الفعلي للمهاجرات، وإعداد Auth وإنشاء أول حساب مدرب، ما زالت خطوات مطلوبة. ملف `HBI_FRESH_INSTALL.sql` المرفق خارج ZIP مخصص لقاعدة جديدة فارغة فقط؛ يبدأ بحارس يرفض وجود جداول عامة أو سجل مهاجرات سابق. لا تستخدمه لترقية قاعدة موجودة. للمشروعات الموجودة استخدم `db push` للأمام كما يلي، بعد مراجعة بيانات الترقية.

من مجلد المشروع، سجّل الدخول واربط مرجع المشروع الصحيح ثم طبّق المهاجرات:

```powershell
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push
```

طبّق كل المهاجرات المضمنة، ثم تحقق من RLS وإنشاء المؤسسة بحساب مستخدم عادي. لا تستخدم `db reset` على مشروع مستضاف. لإنشاء أول حساب مدرب استخدم Supabase Auth؛ واجهة HBI الحالية تسجل الدخول بالبريد وكلمة المرور، ولا تتضمن واجهة إنشاء حساب أو استعادة كلمة المرور.

في Auth → URL Configuration، اضبط Site URL على `https://hbi.wadj.online` وأضف `https://hbi.wadj.online/login` إلى Redirect URLs عند استخدام رابط تأكيد. لا توجد حاليًا صفحة `/auth/callback` أو استعادة كلمة مرور؛ لا تضف مسارات وهمية.

## 3. إعداد الاتصال أثناء البناء والتشغيل

انسخ `.env.example` إلى `.env.local`، وضع القيم الحقيقية:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL=https://hbi.wadj.online
NEXT_PUBLIC_APP_NAME=HBI
HBI_AI_ENABLED=false
```

أضف نفس قيمتي Supabase إلى قسم `vars` في نسخة `wrangler.jsonc` المحلية قبل البناء. المثال التالي للقيم العامة فقط:

```json
"NEXT_PUBLIC_SUPABASE_URL": "https://YOUR_PROJECT_REF.supabase.co",
"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "YOUR_PUBLISHABLE_KEY"
```

لا تنشر placeholders. متغيرات NEXT_PUBLIC تدخل حزمة المتصفح أثناء البناء؛ تغييرها يستلزم إعادة البناء. إعداد Worker يحتاج القيم نفسها لتحديث جلسة المصادقة على الخادم. `nodejs_compat` مع compatibility date الحالي يتيح متغيرات Worker عبر `process.env`. إعدادات vars في الملف هي مرجع النشر؛ لا تعتمد على بقاء تعديلات Dashboard عند نشر لاحق.

اترك مفاتيح R2 وAI وservice_role فارغة للنسخة الأساسية. أي أسرار اختيارية تُضاف لاحقًا عبر Cloudflare secrets، ولا توضع في vars أو الملفات المسلّمة. الفيديو يظل محليًا؛ المقاطع مراجع زمنية.

## 4. البناء ثم النشر

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build:cf
pnpm exec wrangler deploy --dry-run
```

بعد اكتمال Supabase وتفعيل منطقة DNS، تحقق من حساب Wrangler الصحيح ثم انشر:

```powershell
pnpm exec wrangler login
pnpm exec wrangler whoami
pnpm deploy:cf
```

Cloudflare Vite plugin يولّد إعداد النشر في dist ويعيد توجيه Wrangler إليه. عدّل ملف المصدر ثم أعد البناء؛ لا تعدّل dist يدويًا. النشر خطوة فعلية مستقلة عن dry-run. راجع `ZERO_COST_LIMITS.md` والتزام الحساب بالخطة المجانية؛ نجاح البناء لا يثبت أداء المباريات الكاملة أو حصص التشغيل.

## 5. التحقق من النسخة المنشورة

افتح HTTPS، وسجّل الدخول بحساب المدرب. أنشئ مؤسسة وفريقًا ومباراة، ثم سجّل تصويبة وأعد تحميل الصفحة للتحقق من الحفظ في Supabase. اختبر viewer للقراءة فقط وعزل مؤسستين، وانقطاع الاتصال ثم عودة المزامنة. جرّب إعادة ربط فيديو محلي وقائمة مقاطع واجتماعًا، وسجّل الخروج وتأكد من منع الوصول للحساب السابق. افحص تجديد الجلسة والسجلات دون طباعة كلمات مرور أو tokens.

نجاح dry-run محلي لا يغني عن هذه الاختبارات على الدومين الفعلي. إذا نُقل الاستخدام من localhost إلى الدومين، فمسودات IndexedDB المحلية لا تنتقل بين origins تلقائيًا؛ صدّر النسخة الاحتياطية من المصدر ثم استوردها بنفس المستخدم والمؤسسة.

## المصادر

- [Cloudflare Worker Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare full DNS setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
- [Worker environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Cloudflare Pages custom subdomains with external DNS](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare Pages advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/)
- [SpaceMail with Cloudflare DNS](https://www.spaceship.com/knowledgebase/set-up-spacemail-dns-records-cloudflare/)
