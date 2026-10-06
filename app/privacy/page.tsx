import Link from "next/link";
export default function Privacy() {
  return (
    <main className="privacy-page" dir="rtl">
      <Link href="/matches">← HBI</Link>
      <h1>خصوصية HBI وشروط الاستخدام</h1>
      <p>آخر تحديث: 6 أكتوبر 2026</p>
      <h2>بيانات التحليل</h2>
      <p>
        يحفظ HBI بيانات حسابك ومؤسستك وتحليلات المباريات في Supabase، مع صلاحيات
        حسب المؤسسة والدور. المسودات والعمليات غير المتزامنة محفوظة في IndexedDB
        في متصفحك ومنفصلة حسب الحساب والمؤسسة. تسجيل الخروج يمنع عرض مسودات
        الحساب السابق؛ حذف بيانات المتصفح قد يزيل المسودات التي لم تزامنها.
      </p>
      <h2>الفيديو المحلي</h2>
      <p>
        يبقى الملف على جهازك. نحفظ بصمته ومدته وبياناته الوصفية لإعادة الربط،
        والمقاطع مراجع زمنية. رفع الفيديو إلى R2 يتم فقط بطلبك إذا جهزت المشاركة
        الاختيارية.
      </p>
      <h2>YouTube</h2>
      <p>
        اختيار تحميل المشغل يتصل بخدمات YouTube API من Google، التي قد تجمع
        معلومات الجهاز والتشغيل وتستخدم ملفات تعريف الارتباط وتعرض الإعلانات وفق
        سياستها. لا يطلب HBI حساب YouTube أو صلاحيات OAuth، ولا يخزن بيانات
        تسجيل دخول YouTube، ولا ينزل التسجيل. نحفظ معرّف المصدر ومدته ومراجع
        التوقيت مع تحليلك، دون تمرير قوائم لاعبيك أو ملاحظاتك إلى YouTube.
      </p>
      <p>
        باستخدام مشغل YouTube توافق على{" "}
        <a href="https://www.youtube.com/t/terms">شروط YouTube</a>. راجع{" "}
        <a href="https://policies.google.com/privacy">خصوصية Google</a>. يمكنك
        استخدام ملف محلي بدل تحميل المشغل الخارجي، وإغلاق المشغل لوقف اتصاله.
      </p>
      <h2>التحكم والاحتفاظ</h2>
      <p>
        يمكنك تصدير نسخة من مسوداتك وحذف سجلاتك حسب صلاحياتك داخل المؤسسة. إدارة
        العضويات وبيانات المؤسسة تتم بواسطة مالك المؤسسة. لحذف حسابك أو مراجعة
        الاحتفاظ بالبيانات تواصل مع مسؤول مؤسسة HBI عبر wadj.studio@gmail.com.
        النسخ الاحتياطية للبنية المستضيفة قد تخضع لسياسة مزودها.
      </p>
      <h2>شروط HBI</h2>
      <p>
        استخدم محتوى يحق لك الوصول إليه وتحليله ومشاركته. نتائج التحليل تعتمد
        الأحداث التي يراجعها المحلل، وحجم العينة ونقص البيانات، ولا تمثل إحصاءات
        رسمية إلا إذا أشير إلى مصدرها. الخدمة في مرحلة V1؛ احتفظ بنسخ احتياطية،
        والخدمات المجانية تخضع لحصص الاستضافة والتخزين.
      </p>
      <hr />
      <section dir="ltr" lang="en">
        <h2>HBI privacy & terms</h2>
        <p>
          HBI stores account, organization and analysis data in Supabase with
          organization and role access controls. Browser drafts are scoped to
          your account and organization. Local video remains on your device;
          metadata and time references are stored. R2 upload is optional and
          user initiated.
        </p>
        <p>
          Loading the YouTube player uses YouTube API Services. Google may
          process device and playback information, cookies and ads under its
          privacy policy. HBI requests no YouTube credentials or OAuth access
          and downloads no YouTube video. Analysis notes and rosters are not
          sent to YouTube. By using this player you agree to the linked YouTube
          Terms. Use a local file if you prefer not to load YouTube.
        </p>
        <p>
          Export or delete analysis within your role permissions; contact your
          organization administrator at wadj.studio@gmail.com for account
          deletion and data retention requests. Use content you are entitled to
          analyze and share. Reviewed samples underpin analysis; it is not
          official match data unless attributed. V1 and free hosting quotas have
          practical limits; keep backups.
        </p>
      </section>
    </main>
  );
}
