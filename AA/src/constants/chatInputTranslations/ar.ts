const translations = {
      loadFile: 'إضافة ملف',
      loadUrl: 'إضافة URL',
      loadFileFromUrl: 'تحميل ملف URL',
      voiceInput: 'إدخال صوتي',
      fileDialog: 'إضافة ملف إلى الطلب',
      urlDialog: 'إضافة URL إلى الطلب',
      loadFileUrlDialog: 'تحميل ملف من URL إلى المحادثة',
      filePath: 'مسار الملف',
      urlPath: 'URL الموقع',
      fileUrlPath: 'URL الملف',
      add: 'إضافة',
      load: 'تحميل',
      cancel: 'إلغاء',
      browse: 'استعراض...',
      fileDescription: 'أدخل المسار الكامل للملف أو استعرض جهازك لإضافته إلى الطلب.',
      urlDescription: 'أدخل URL الكامل للموقع لإضافته إلى الطلب.',
      loadFileUrlDescription: 'أدخل URL المباشر للملف لتحميل محتواه في المحادثة.',
      filePathPlaceholder: 'C:\\Documents\\myFile.txt أو /home/user/document.md',
      urlPlaceholder: 'https://example.com أو https://docs.example.com/api',
      fileUrlPlaceholder: 'https://example.com/document.txt',
      loading: 'جارٍ الإضافة...',
      loadingFile: 'جارٍ تحميل الملف...',
      fileAdded: 'تم إضافة الملف إلى الطلب',
      urlAdded: 'تم إضافة URL إلى الطلب',
      fileLoadedToChat: 'تم تحميل الملف في المحادثة',
      fileError: 'خطأ في إضافة الملف',
      urlError: 'خطأ في إضافة URL',
      loadFileError: 'خطأ في تحميل الملف',
      invalidUrl: 'URL غير صحيح',
      networkError: 'خطأ في الشبكة',
      fileNotFound: 'الملف غير موجود',
      unsupportedFormat: 'تنسيق ملف غير مدعوم',
      send: 'إرسال',
      addToPrompt: 'إضافة إلى الطلب',
      supportedFormats: 'التنسيقات المدعومة',
      preview: 'معاينة',
      examples: 'أمثلة على URLs صحيحة',
      directLink: 'رابط مباشر للملف',
      rawContent: 'محتوى خام (GitHub، إلخ)',
      publicFile: 'ملف عام',
      // قراءة صوتية
      enableAudioPlayback: 'تشغيل القراءة الصوتية',
      disableAudioPlayback: 'إيقاف القراءة الصوتية',
      speechSynthesisNotSupported: 'القراءة الصوتية غير مدعومة في هذا المتصفح',
      contentAnalyzerNotice: 'تنبيه: مساعد «محلل المحتوى» فقط هو الذي يدمج كامل المستند في المحادثة. أما بقية المساعدين فيعيدون تحليله عند كل سؤال جديد.',
      // Speech recognition
      startListening: 'بدء الاستماع',
      stopListening: 'إيقاف الاستماع',
      listening: 'جارٍ الاستماع...',
      speechNotSupported: 'التعرف على الكلام غير مدعوم في هذا المتصفح',
      microphonePermissionDenied: 'تم رفض إذن الميكروفون',
      speechRecognitionError: 'خطأ في التعرف على الكلام',
      speechStarted: 'تم بدء الاستماع الصوتي',
      speechStopped: 'تم إيقاف الاستماع الصوتي',
      transcribing: 'جارٍ النسخ...',
      speakNow: 'تحدث الآن',
      clickToStartSpeaking: 'انقر لبدء التحدث',
      noSpeechDetected: 'لم يتم اكتشاف كلام',
      speechTimeout: 'انتهت مهلة الاستماع',
      browserNotSupported: 'متصفحك لا يدعم التعرف على الكلام',
      checkingPermissions: 'جارٍ فحص الأذونات...',
      requestPermission: 'طلب الإذن',
      permissionGranted: 'تم منح الإذن',
      permissionDenied: 'تم رفض الإذن',
      microphoneAccessRequired: 'مطلوب الوصول إلى الميكروفون',
      // Permission dialog
      permissionTitle: 'إذن الميكروفون مطلوب',
      permissionDescription: 'لاستخدام الإدخال الصوتي، نحتاج الوصول إلى الميكروفون.',
      permissionInstructions: 'تعليمات للسماح بالميكروفون',
      permissionStep1: '1. انقر على أيقونة 🔒 أو 🛡️ في شريط العنوان',
      permissionStep2: '2. اختر "السماح" للميكروفون',
      permissionStep3: '3. أعد تحميل الصفحة إذا لزم الأمر',
      permissionChrome: 'في Chrome / Edge',
      permissionFirefox: 'في Firefox',
      permissionSafari: 'في Safari',
      permissionGeneric: 'تعليمات عامة',
      tryAgain: 'حاول مرة أخرى',
      openSettings: 'فتح الإعدادات',
      permissionBlocked: 'تم حظر الوصول إلى الميكروفون',
      permissionBlockedHelp: 'تحتاج إلى السماح بالوصول إلى الميكروفون في إعدادات المتصفح.',
      httpsRequired: 'HTTPS مطلوب',
      httpsRequiredDesc: 'التعرف على الكلام يتطلب اتصال آمن (HTTPS).'
    }

export type ChatInputTranslation = typeof translations;

export default translations;
