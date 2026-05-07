/**
 * BIM Plan Pro - AI Engine
 * Generates ISO 19650 compliant BIM Execution Plans
 */
const AIEngine = (() => {

    const projectTypeNames = {
        residential: 'سكني',
        commercial: 'تجاري',
        mixed: 'متعدد الاستخدامات',
        industrial: 'صناعي',
        infrastructure: 'بنية تحتية',
        healthcare: 'صحي',
        educational: 'تعليمي',
        hospitality: 'فندقي / ضيافة',
        government: 'حكومي'
    };

    const projectTypeNamesEN = {
        residential: 'Residential',
        commercial: 'Commercial',
        mixed: 'Mixed Use',
        industrial: 'Industrial',
        infrastructure: 'Infrastructure',
        healthcare: 'Healthcare',
        educational: 'Educational',
        hospitality: 'Hospitality',
        government: 'Government'
    };

    const scaleNames = {
        small: 'صغير (أقل من 5,000 م²)',
        medium: 'متوسط (5,000 - 50,000 م²)',
        large: 'كبير (50,000 - 200,000 م²)',
        mega: 'ضخم (أكثر من 200,000 م²)'
    };

    const scaleNamesEN = {
        small: 'Small (< 5,000 m²)',
        medium: 'Medium (5,000 - 50,000 m²)',
        large: 'Large (50,000 - 200,000 m²)',
        mega: 'Mega (> 200,000 m²)'
    };

    const disciplineNames = {
        architecture: 'معماري',
        structural: 'إنشائي',
        mep: 'ميكانيكي وكهربائي وسباكة',
        civil: 'مدني',
        landscape: 'تنسيق المواقع',
        interior: 'تصميم داخلي',
        other: 'أخرى'
    };

    const disciplineNamesEN = {
        architecture: 'Architecture',
        structural: 'Structural',
        mep: 'MEP (Mechanical, Electrical & Plumbing)',
        civil: 'Civil',
        landscape: 'Landscape',
        interior: 'Interior Design',
        other: 'Other'
    };

    const bimUseNames = {
        '3DCoordination': 'التنسيق ثلاثي الأبعاد',
        'ClashDetection': 'كشف التعارضات',
        'QuantityTakeoff': 'حصر الكميات',
        '4DScheduling': 'الجدولة الزمنية 4D',
        '5DCostEstimation': 'تقدير التكاليف 5D',
        'EnergyAnalysis': 'تحليل الطاقة',
        'FacilityManagement': 'إدارة المرافق',
        'Visualization': 'التصور والعرض',
        'AsBuilt': 'نماذج كما بُني'
    };

    const bimUseNamesEN = {
        '3DCoordination': '3D Coordination',
        'ClashDetection': 'Clash Detection',
        'QuantityTakeoff': 'Quantity Takeoff',
        '4DScheduling': '4D Scheduling',
        '5DCostEstimation': '5D Cost Estimation',
        'EnergyAnalysis': 'Energy Analysis',
        'FacilityManagement': 'Facility Management',
        'Visualization': 'Visualization',
        'AsBuilt': 'As-Built Models'
    };

    const lodDescriptions = {
        '100': 'مفاهيمي - عناصر تمثيلية بحجم وشكل وموقع تقريبي',
        '200': 'تقريبي - عناصر بهندسة عامة ومعلومات أولية',
        '300': 'دقيق - عناصر بهندسة دقيقة ومعلومات مفصلة',
        '350': 'تنسيقي - عناصر مع واجهات بين الأنظمة',
        '400': 'تصنيعي - عناصر بتفاصيل كافية للتصنيع والتركيب',
        '500': 'كما بُني - عناصر تمثل الوضع الفعلي المنفذ'
    };

    const lodDescriptionsEN = {
        '100': 'Conceptual — Representational elements with approximate size, shape, and location',
        '200': 'Approximate — Elements with generic geometry and preliminary information',
        '300': 'Precise — Elements with precise geometry and detailed information',
        '350': 'Coordination — Elements with interfaces between systems',
        '400': 'Fabrication — Elements with sufficient detail for fabrication and installation',
        '500': 'As-Built — Elements representing the actual built condition'
    };

    function _formatDate(dateStr) {
        if (!dateStr) return 'غير محدد';
        const d = new Date(dateStr);
        return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function _formatDateEN(dateStr) {
        if (!dateStr) return 'Not specified';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function _generateSection1(data) {
        return {
            number: 1,
            title: 'معلومات المشروع (Project Information)',
            content: `
                <h4>1.1 بيانات المشروع الأساسية</h4>
                <table>
                    <tr><th>اسم المشروع</th><td>${_esc(data.projectInfo.name)}</td></tr>
                    <tr><th>رقم المشروع</th><td>${_esc(data.projectInfo.number) || 'غير محدد'}</td></tr>
                    <tr><th>موقع المشروع</th><td>${_esc(data.projectInfo.location)}</td></tr>
                    <tr><th>اسم العميل</th><td>${_esc(data.projectInfo.client)}</td></tr>
                    <tr><th>نوع المشروع</th><td>${projectTypeNames[data.projectInfo.type] || data.projectInfo.type}</td></tr>
                    <tr><th>حجم المشروع</th><td>${scaleNames[data.projectInfo.scale] || 'غير محدد'}</td></tr>
                    <tr><th>تاريخ البداية</th><td>${_formatDate(data.projectInfo.startDate)}</td></tr>
                    <tr><th>تاريخ الانتهاء</th><td>${_formatDate(data.projectInfo.endDate)}</td></tr>
                </table>

                <h4>1.2 وصف المشروع</h4>
                <p>${_esc(data.projectInfo.description) || 'لم يتم تقديم وصف تفصيلي للمشروع.'}</p>

                <h4>1.3 نطاق خطة تنفيذ BIM</h4>
                <p>تحدد هذه الوثيقة خطة تنفيذ نمذجة معلومات البناء (BEP) لمشروع "${_esc(data.projectInfo.name)}" وفقاً لمتطلبات معيار ISO 19650. تشمل الخطة جميع مراحل دورة حياة المشروع من التصميم المفاهيمي حتى التسليم، وتحدد الإجراءات والمعايير والأدوار اللازمة لإدارة المعلومات بفعالية.</p>

                <h4>1.4 المعايير والمراجع</h4>
                <ul>
                    <li>ISO 19650-1:2018 - تنظيم وترقيم المعلومات حول أعمال البناء - إدارة المعلومات باستخدام نمذجة معلومات البناء - الجزء 1: المفاهيم والمبادئ</li>
                    <li>ISO 19650-2:2018 - الجزء 2: مرحلة التسليم للأصول</li>
                    <li>ISO 19650-3:2020 - الجزء 3: مرحلة التشغيل للأصول</li>
                    <li>ISO 19650-5:2020 - الجزء 5: نهج أمني لإدارة المعلومات</li>
                </ul>

                <h4>1.5 المنظورات الإستراتيجية لإدارة المعلومات (ISO 19650-1)</h4>
                <p>تعتمد الخطة على أربعة منظورات متكاملة لضمان أن إنتاج المعلومات يخدم القيمة الفعلية للمشروع والأصل:</p>
                <ul>
                    <li><strong>منظور المالك:</strong> ضمان دعم المعلومات لأهداف الأعمال والقرارات الاستثمارية.</li>
                    <li><strong>منظور المستخدم:</strong> ضمان قابلية استخدام الأصل وسلامة التشغيل وجودة تجربة المستخدم النهائي.</li>
                    <li><strong>منظور المنفذ:</strong> تمكين فرق التصميم والتنفيذ من التنسيق والإنتاج بكفاءة.</li>
                    <li><strong>منظور المجتمع:</strong> مراعاة السلامة والاستدامة والامتثال التنظيمي والأثر المجتمعي.</li>
                </ul>
            `
        };
    }

    function _generateSection2(data) {
        let teamsTable = '';
        if (data.teams && data.teams.length > 0) {
            teamsTable = `
                <h4>2.4 فرق المهام (Task Teams)</h4>
                <table>
                    <tr>
                        <th>الفريق</th>
                        <th>الشركة</th>
                        <th>التخصص</th>
                        <th>البريد الإلكتروني</th>
                    </tr>
                    ${data.teams.map((t, i) => `
                    <tr>
                        <td>${_esc(t.name) || 'فريق المهام ' + (i + 1)}</td>
                        <td>${_esc(t.company) || '-'}</td>
                        <td>${disciplineNames[t.discipline] || t.discipline}</td>
                        <td>${_esc(t.email) || '-'}</td>
                    </tr>`).join('')}
                </table>
            `;
        }

        return {
            number: 2,
            title: 'الأدوار والمسؤوليات (Roles and Responsibilities)',
            content: `
                <p>وفقاً لمعيار ISO 19650، يتم تحديد الأدوار والمسؤوليات التالية لإدارة المعلومات في المشروع:</p>

                <h4>2.1 الطرف المعيّن (Appointing Party)</h4>
                <table>
                    <tr><th>الجهة</th><td>${_esc(data.roles.appointingParty.name) || _esc(data.projectInfo.client)}</td></tr>
                    <tr><th>البريد الإلكتروني</th><td>${_esc(data.roles.appointingParty.contact) || '-'}</td></tr>
                </table>
                <p><strong>المسؤوليات:</strong></p>
                <ul>
                    <li>تحديد متطلبات المعلومات التنظيمية (OIR)</li>
                    <li>إعداد متطلبات تبادل المعلومات (EIR)</li>
                    <li>تقييم خطط تنفيذ BIM المقدمة من الأطراف المعيّنة</li>
                    <li>قبول حزم المعلومات المسلّمة</li>
                    <li>ضمان توافق المعلومات مع المعايير المحددة</li>
                </ul>

                <h4>2.2 الطرف المعيّن الرئيسي (Lead Appointed Party)</h4>
                <table>
                    <tr><th>الجهة</th><td>${_esc(data.roles.leadAP.name) || '-'}</td></tr>
                    <tr><th>البريد الإلكتروني</th><td>${_esc(data.roles.leadAP.contact) || '-'}</td></tr>
                </table>
                <p><strong>المسؤوليات:</strong></p>
                <ul>
                    <li>إعداد خطة تنفيذ BIM الرئيسية (Pre-appointment BEP)</li>
                    <li>تنسيق عمل فرق المهام</li>
                    <li>ضمان اتساق المعلومات بين جميع الأطراف</li>
                    <li>إدارة عملية تجميع النموذج الفيدرالي</li>
                    <li>مراقبة الجودة والتوافق مع المعايير</li>
                </ul>

                <h4>2.3 مدير المعلومات (Information Manager)</h4>
                <table>
                    <tr><th>الاسم</th><td>${_esc(data.roles.infoManager.name) || 'سيتم تحديده'}</td></tr>
                    <tr><th>البريد الإلكتروني</th><td>${_esc(data.roles.infoManager.contact) || '-'}</td></tr>
                </table>
                <p><strong>المسؤوليات:</strong></p>
                <ul>
                    <li>إدارة بيئة البيانات المشتركة (CDE)</li>
                    <li>مراقبة الالتزام بمعايير التسمية والتصنيف</li>
                    <li>إدارة عمليات المراجعة والاعتماد</li>
                    <li>التنسيق بين الأطراف لحل قضايا المعلومات</li>
                    <li>إعداد تقارير حالة المعلومات الدورية</li>
                </ul>

                ${teamsTable}

                <h4>2.5 مصفوفة المسؤوليات (RACI Matrix)</h4>
                <table>
                    <tr>
                        <th>المهمة</th>
                        <th>الطرف المعيّن</th>
                        <th>الطرف الرئيسي</th>
                        <th>مدير المعلومات</th>
                        <th>فرق المهام</th>
                    </tr>
                    <tr>
                        <td>تحديد متطلبات المعلومات (EIR)</td>
                        <td>R/A</td><td>C</td><td>C</td><td>I</td>
                    </tr>
                    <tr>
                        <td>إعداد خطة تنفيذ BIM</td>
                        <td>A</td><td>R</td><td>C</td><td>C</td>
                    </tr>
                    <tr>
                        <td>إدارة CDE</td>
                        <td>I</td><td>A</td><td>R</td><td>C</td>
                    </tr>
                    <tr>
                        <td>إنتاج النماذج</td>
                        <td>I</td><td>A</td><td>C</td><td>R</td>
                    </tr>
                    <tr>
                        <td>مراجعة الجودة</td>
                        <td>A</td><td>R</td><td>R</td><td>C</td>
                    </tr>
                    <tr>
                        <td>كشف التعارضات</td>
                        <td>I</td><td>R/A</td><td>C</td><td>R</td>
                    </tr>
                    <tr>
                        <td>تسليم المعلومات</td>
                        <td>A</td><td>R</td><td>R</td><td>C</td>
                    </tr>
                </table>
                <p><small>R = مسؤول | A = معتمد | C = مستشار | I = مُبلَّغ</small></p>

                <h4>2.6 تقييم القدرة والسعة (Capability & Capacity Assessment)</h4>
                <table>
                    <tr><th>معيار التقييم</th><th>الوصف</th><th>آلية التحقق</th></tr>
                    <tr><td>القدرة التقنية</td><td>خبرة الفريق في تطبيق ISO 19650 وأدوات BIM</td><td>السير الذاتية + مشاريع مرجعية + شهادات</td></tr>
                    <tr><td>السعة التشغيلية</td><td>توفر الموارد البشرية والزمنية لتلبية برنامج التسليم</td><td>خطة موارد + حمل العمل + التزامات التوافر</td></tr>
                    <tr><td>قدرة الحوكمة</td><td>وجود عمليات QA/QC وإجراءات مراجعة داخلية</td><td>إجراءات موثقة + نماذج فحص + تقارير سابقة</td></tr>
                    <tr><td>قدرة التبادل</td><td>القدرة على تبادل المعلومات بصيغ متوافقة (IFC/BCF)</td><td>اختبار تبادل تجريبي قبل بدء التنفيذ</td></tr>
                </table>

                <h4>2.7 مصفوفة مسؤوليات تفصيلية لحاويات المعلومات</h4>
                <table>
                    <tr><th>حاوية المعلومات</th><th>المنشئ</th><th>المدقق الداخلي</th><th>المراجع</th><th>المعتمد للنشر</th></tr>
                    <tr><td>نموذج معماري</td><td>فريق معماري</td><td>قائد الفريق</td><td>مدير المعلومات</td><td>الطرف الرئيسي</td></tr>
                    <tr><td>نموذج إنشائي</td><td>فريق إنشائي</td><td>قائد الفريق</td><td>مدير المعلومات</td><td>الطرف الرئيسي</td></tr>
                    <tr><td>نموذج MEP</td><td>فريق MEP</td><td>قائد الفريق</td><td>مدير المعلومات</td><td>الطرف الرئيسي</td></tr>
                    <tr><td>النموذج الفيدرالي</td><td>الطرف الرئيسي</td><td>منسق BIM</td><td>مدير المعلومات</td><td>الطرف المعيّن</td></tr>
                    <tr><td>وثائق التسليم النهائي (AIM Inputs)</td><td>فرق المهام</td><td>الطرف الرئيسي</td><td>مدير المعلومات</td><td>الطرف المعيّن</td></tr>
                </table>
            `
        };
    }

    function _generateSection3(data) {
        const cdeNames = {
            'ACC': 'Autodesk Construction Cloud',
            'Aconex': 'Oracle Aconex',
            'ProjectWise': 'Bentley ProjectWise',
            'Trimble': 'Trimble Connect',
            'SharePoint': 'SharePoint',
            'Nextcloud': 'Nextcloud',
            'custom': 'نظام مخصص'
        };

        return {
            number: 3,
            title: 'بيئة البيانات المشتركة (Common Data Environment - CDE)',
            content: `
                <h4>3.1 نظام CDE المعتمد</h4>
                <p>سيتم استخدام نظام <strong>${cdeNames[data.technical.cde] || data.technical.cde || 'سيتم تحديده'}</strong> كبيئة بيانات مشتركة للمشروع وفقاً لمتطلبات ISO 19650.</p>

                <h4>3.2 سير عمل CDE (CDE Workflow)</h4>
                <p>يتبع سير العمل في بيئة البيانات المشتركة المراحل الأربع المحددة في ISO 19650:</p>
                <table>
                    <tr>
                        <th>المرحلة</th>
                        <th>الحالة</th>
                        <th>الوصف</th>
                        <th>المسؤول</th>
                    </tr>
                    <tr>
                        <td>العمل الجاري</td>
                        <td>WIP (Work in Progress)</td>
                        <td>منطقة عمل الفرق الفردية لتطوير المعلومات</td>
                        <td>فرق المهام</td>
                    </tr>
                    <tr>
                        <td>المشترك</td>
                        <td>SHARED</td>
                        <td>المعلومات المتاحة للتنسيق بين الفرق</td>
                        <td>مدير المعلومات</td>
                    </tr>
                    <tr>
                        <td>المنشور</td>
                        <td>PUBLISHED</td>
                        <td>المعلومات المعتمدة والمتاحة لجميع الأطراف</td>
                        <td>الطرف المعيّن الرئيسي</td>
                    </tr>
                    <tr>
                        <td>الأرشيف</td>
                        <td>ARCHIVED</td>
                        <td>المعلومات المحفوظة كسجل للمشروع</td>
                        <td>مدير المعلومات</td>
                    </tr>
                </table>

                <h4>3.3 بروتوكول المراجعة والاعتماد</h4>
                <ul>
                    <li><strong>النقل من WIP إلى SHARED:</strong> يتم بواسطة مُنشئ المعلومات بعد إتمام فحوصات الجودة الداخلية</li>
                    <li><strong>النقل من SHARED إلى PUBLISHED:</strong> يتطلب موافقة مدير المعلومات والطرف المعيّن الرئيسي</li>
                    <li><strong>المراجعة:</strong> يجب إتمام المراجعة خلال 5 أيام عمل كحد أقصى</li>
                    <li><strong>الإصدارات:</strong> يتم الاحتفاظ بجميع الإصدارات السابقة مع تاريخ التعديل</li>
                </ul>

                <h4>3.4 هيكل المجلدات</h4>
                <p>يتم تنظيم المجلدات في CDE وفقاً للهيكل التالي:</p>
                <ul>
                    <li><strong>/[رقم المشروع]/WIP/[التخصص]/</strong> - ملفات العمل الجاري</li>
                    <li><strong>/[رقم المشروع]/SHARED/[التخصص]/</strong> - الملفات المشتركة</li>
                    <li><strong>/[رقم المشروع]/PUBLISHED/[التخصص]/</strong> - الملفات المعتمدة</li>
                    <li><strong>/[رقم المشروع]/ARCHIVED/</strong> - الأرشيف</li>
                </ul>

                <h4>3.5 صلاحيات الوصول</h4>
                <table>
                    <tr>
                        <th>الدور</th>
                        <th>WIP</th>
                        <th>SHARED</th>
                        <th>PUBLISHED</th>
                        <th>ARCHIVED</th>
                    </tr>
                    <tr>
                        <td>الطرف المعيّن</td>
                        <td>-</td><td>قراءة</td><td>قراءة</td><td>قراءة</td>
                    </tr>
                    <tr>
                        <td>الطرف الرئيسي</td>
                        <td>قراءة</td><td>قراءة/كتابة</td><td>قراءة/كتابة</td><td>قراءة</td>
                    </tr>
                    <tr>
                        <td>مدير المعلومات</td>
                        <td>قراءة</td><td>قراءة/كتابة</td><td>قراءة/كتابة</td><td>قراءة/كتابة</td>
                    </tr>
                    <tr>
                        <td>فرق المهام</td>
                        <td>قراءة/كتابة (فريقهم فقط)</td><td>قراءة</td><td>قراءة</td><td>-</td>
                    </tr>
                </table>

                <h4>3.6 حوكمة البيانات الوصفية (Metadata Governance)</h4>
                <p>الـ CDE في هذا المشروع يُدار كنظام بيانات وصفية، وليس هيكل مجلدات فقط. لكل حاوية معلومات سمات إلزامية قبل قبولها:</p>
                <table>
                    <tr><th>السمة</th><th>الغرض</th><th>مطلوب قبل النشر</th></tr>
                    <tr><td>Revision Code</td><td>تتبع النسخ والتغييرات</td><td>نعم</td></tr>
                    <tr><td>Status Code</td><td>تحديد حالة الاستخدام والاعتماد</td><td>نعم</td></tr>
                    <tr><td>Originator</td><td>تحديد الجهة المنشئة للمعلومة</td><td>نعم</td></tr>
                    <tr><td>Container ID</td><td>تعريف فريد لحاوية المعلومات</td><td>نعم</td></tr>
                    <tr><td>Approval Record</td><td>إثبات مسار المراجعة والاعتماد</td><td>نعم</td></tr>
                </table>
            `
        };
    }

    function _generateSection4(data) {
        const lods = data.bimSettings.lods || ['100', '200', '300'];
        const lodRows = lods.map(l => `
            <tr>
                <td>LOD ${l}</td>
                <td>${lodDescriptions[l] || '-'}</td>
            </tr>
        `).join('');

        return {
            number: 4,
            title: 'استراتيجية تسليم المعلومات (Information Delivery Strategy)',
            content: `
                <h4>4.1 مستويات تطوير المعلومات (Level of Information Need)</h4>
                <p>تحدد مستويات تطوير المعلومات وفقاً لمتطلبات المشروع والمراحل المختلفة:</p>
                <table>
                    <tr><th>المستوى</th><th>الوصف</th></tr>
                    ${lodRows}
                </table>

                <h4>4.2 مراحل التسليم</h4>
                <table>
                    <tr>
                        <th>المرحلة</th>
                        <th>مستوى المعلومات</th>
                        <th>التسليمات الرئيسية</th>
                    </tr>
                    <tr>
                        <td>التصميم المفاهيمي</td>
                        <td>LOD 100</td>
                        <td>نموذج مفاهيمي، دراسة الجدوى</td>
                    </tr>
                    <tr>
                        <td>التصميم الأولي</td>
                        <td>LOD 200</td>
                        <td>نماذج أولية، تقديرات التكلفة</td>
                    </tr>
                    <tr>
                        <td>التصميم التفصيلي</td>
                        <td>LOD 300</td>
                        <td>نماذج تفصيلية، وثائق البناء</td>
                    </tr>
                    <tr>
                        <td>التنسيق</td>
                        <td>LOD 350</td>
                        <td>نموذج فيدرالي، تقارير التعارضات</td>
                    </tr>
                    ${lods.includes('400') ? `<tr>
                        <td>التصنيع</td>
                        <td>LOD 400</td>
                        <td>نماذج التصنيع، تفاصيل التركيب</td>
                    </tr>` : ''}
                    ${lods.includes('500') ? `<tr>
                        <td>كما بُني</td>
                        <td>LOD 500</td>
                        <td>نموذج As-Built، بيانات التشغيل</td>
                    </tr>` : ''}
                </table>

                <h4>4.3 جدول تسليم المعلومات (MIDP - Master Information Delivery Plan)</h4>
                <p>سيتم إعداد جدول تسليم المعلومات الرئيسي (MIDP) بالتنسيق بين جميع فرق المهام ويشمل:</p>
                <ul>
                    <li>تحديد حزم المعلومات المطلوبة لكل مرحلة</li>
                    <li>تواريخ التسليم المستهدفة</li>
                    <li>المسؤول عن كل حزمة معلومات</li>
                    <li>معايير القبول لكل تسليم</li>
                    <li>تبعيات المعلومات بين الفرق</li>
                </ul>

                <h4>4.4 خطة مسؤولية تسليم المعلومات لكل فريق (TIDP)</h4>
                <p>يتم إعداد خطة تسليم المعلومات الخاصة بكل فريق مهام (TIDP) وتشمل:</p>
                <ul>
                    <li>قائمة النماذج والوثائق المسؤول عنها الفريق</li>
                    <li>الجدول الزمني للتسليم</li>
                    <li>بروتوكولات ضمان الجودة الداخلية</li>
                    <li>نقاط التنسيق مع الفرق الأخرى</li>
                </ul>

                <h4>4.5 دورة عمليات ISO 19650-2 (مرحلة التسليم)</h4>
                <ol>
                    <li>تحديد متطلبات المعلومات على مستوى التعيين.</li>
                    <li>الدعوة للتعاقد (Invitation to Tender) مع تضمين متطلبات المعلومات بوضوح.</li>
                    <li>استلام وتقييم عروض الأطراف المعيّنة بناءً على القدرة والسعة.</li>
                    <li>التعيين الرسمي وتأكيد أدوار الأطراف.</li>
                    <li>إصدار وتطوير BEP قبل التنفيذ التفصيلي.</li>
                    <li>إعداد MIDP/TIDP وتأكيد التبعيات بين التسليمات.</li>
                    <li>الإنتاج والتحقق الذاتي ثم المراجعة ضمن CDE.</li>
                    <li>الاعتماد الرسمي للتسليمات وقبولها التعاقدي.</li>
                </ol>
            `
        };
    }

    function _generateSection5(data) {
        const softwareList = (data.technical.software || []).join('، ') || 'سيتم تحديدها';
        const coordTools = (data.technical.coordination || []).join('، ') || 'سيتم تحديدها';
        const formats = (data.technical.formats || []).join('، ') || 'IFC';

        return {
            number: 5,
            title: 'معايير وطرق المعلومات (Information Standards and Methods)',
            content: `
                <h4>5.1 معيار تسمية الملفات</h4>
                <p>يتم اعتماد معيار تسمية الملفات وفقاً لـ ${data.bimSettings.naming === 'iso19650' ? 'ISO 19650' : data.bimSettings.naming === 'bs1192' ? 'BS 1192' : 'معيار مخصص'}:</p>
                <p><strong>الصيغة:</strong> [المشروع]-[المنشئ]-[الحجم]-[المستوى]-[النوع]-[الدور]-[الرقم]-[الحالة]</p>
                <p><strong>مثال:</strong> ${_esc(data.projectInfo.number) || 'PRJ001'}-ARC-ZZ-01-M3-A-0001-S2</p>
                <table>
                    <tr><th>الحقل</th><th>الوصف</th><th>مثال</th></tr>
                    <tr><td>المشروع</td><td>رمز المشروع</td><td>${_esc(data.projectInfo.number) || 'PRJ001'}</td></tr>
                    <tr><td>المنشئ</td><td>رمز الجهة المنشئة</td><td>ARC, STR, MEP</td></tr>
                    <tr><td>الحجم</td><td>المنطقة أو المبنى</td><td>ZZ (الكل), B1, B2</td></tr>
                    <tr><td>المستوى</td><td>رقم الطابق</td><td>01, 02, RF</td></tr>
                    <tr><td>النوع</td><td>نوع المعلومات</td><td>M3 (نموذج 3D), DR (رسم)</td></tr>
                    <tr><td>الدور</td><td>التخصص</td><td>A (معمار), S (إنشاء)</td></tr>
                    <tr><td>الرقم</td><td>رقم تسلسلي</td><td>0001</td></tr>
                    <tr><td>الحالة</td><td>حالة الوثيقة</td><td>S0 (WIP), S2 (مشترك)</td></tr>
                </table>

                <h4>5.2 نظام التصنيف</h4>
                <p>يتم استخدام نظام <strong>${data.bimSettings.classification === 'uniclass' ? 'Uniclass 2015' : data.bimSettings.classification === 'omniclass' ? 'OmniClass' : data.bimSettings.classification === 'masterformat' ? 'MasterFormat' : 'مخصص'}</strong> لتصنيف العناصر في النماذج.</p>

                <h4>5.3 نظام الوحدات والإحداثيات</h4>
                <table>
                    <tr><th>نظام الوحدات</th><td>${data.technical.units === 'metric' ? 'متري (متر ، ملليمتر)' : 'إمبراطوري (قدم، بوصة)'}</td></tr>
                    <tr><th>نظام الإحداثيات</th><td>${_esc(data.technical.coordinates) || 'سيتم تحديده عند بدء المشروع'}</td></tr>
                    <tr><th>نقطة الأصل</th><td>سيتم تحديدها وتوثيقها ومشاركتها مع جميع الفرق</td></tr>
                </table>

                <h4>5.4 معايير النمذجة</h4>
                <ul>
                    <li>يجب أن تكون جميع العناصر مصنفة وفقاً لنظام التصنيف المعتمد</li>
                    <li>يجب استخدام قوالب المشروع الموحدة المحددة من قبل الطرف المعيّن الرئيسي</li>
                    <li>يجب أن تكون النماذج خالية من العناصر غير الضرورية والمكررة</li>
                    <li>يجب تحديث حالة العناصر عند كل تسليم</li>
                    <li>يجب الالتزام بمعيار IFC للتبادل بين البرامج المختلفة</li>
                </ul>

                <h4>5.5 صيغ التبادل المعتمدة</h4>
                <p><strong>الصيغ المعتمدة:</strong> ${formats}</p>
                <ul>
                    <li><strong>IFC:</strong> يتم استخدامه لجميع عمليات تبادل النماذج بين البرامج المختلفة (IFC 4.0 أو أحدث)</li>
                    <li><strong>الصيغ الأصلية:</strong> يتم الاحتفاظ بها في مجلد WIP ومشاركتها عند الطلب</li>
                    <li><strong>PDF:</strong> لجميع الرسومات والوثائق المعتمدة</li>
                </ul>
            `
        };
    }

    function _generateSection6(data) {
        const softwareList = (data.technical.software || []).join('، ') || 'سيتم تحديدها';
        const coordTools = (data.technical.coordination || []).join('، ') || 'سيتم تحديدها';

        return {
            number: 6,
            title: 'البنية التحتية للتكنولوجيا (Technology Infrastructure)',
            content: `
                <h4>6.1 برامج النمذجة (BIM Authoring Tools)</h4>
                <p><strong>البرامج المعتمدة:</strong> ${softwareList}</p>
                <p>يجب على جميع فرق المهام استخدام الإصدارات المتوافقة من البرامج المعتمدة لضمان التوافق والتبادل السلس للمعلومات.</p>

                <h4>6.2 أدوات التنسيق والمراجعة</h4>
                <p><strong>الأدوات المعتمدة:</strong> ${coordTools}</p>

                <h4>6.3 المتطلبات التقنية</h4>
                <table>
                    <tr><th>المتطلب</th><th>الحد الأدنى</th><th>الموصى به</th></tr>
                    <tr>
                        <td>المعالج</td>
                        <td>Intel i7 / AMD Ryzen 7</td>
                        <td>Intel i9 / AMD Ryzen 9</td>
                    </tr>
                    <tr>
                        <td>الذاكرة</td>
                        <td>16 GB RAM</td>
                        <td>32+ GB RAM</td>
                    </tr>
                    <tr>
                        <td>كرت الشاشة</td>
                        <td>NVIDIA GTX 1660 / مكافئ</td>
                        <td>NVIDIA RTX 3070+ / مكافئ</td>
                    </tr>
                    <tr>
                        <td>القرص الصلب</td>
                        <td>SSD 512 GB</td>
                        <td>NVMe SSD 1 TB+</td>
                    </tr>
                    <tr>
                        <td>الشبكة</td>
                        <td>50 Mbps</td>
                        <td>100+ Mbps</td>
                    </tr>
                </table>

                <h4>6.4 النسخ الاحتياطي</h4>
                <ul>
                    <li>يتم عمل نسخ احتياطي يومي تلقائي لجميع بيانات CDE</li>
                    <li>يتم الاحتفاظ بنسخ احتياطية لمدة 90 يوماً على الأقل</li>
                    <li>يتم اختبار استعادة البيانات بشكل دوري (كل 3 أشهر)</li>
                    <li>يجب على كل فريق الاحتفاظ بنسخ احتياطية محلية لملفات WIP</li>
                </ul>
            `
        };
    }

    function _generateSection7(data) {
        const bimUses = (data.bimSettings.uses || [])
            .map(u => bimUseNames[u] || u);

        return {
            number: 7,
            title: 'استخدامات BIM (BIM Uses)',
            content: `
                <h4>7.1 استخدامات BIM المعتمدة للمشروع</h4>
                <table>
                    <tr>
                        <th>#</th>
                        <th>استخدام BIM</th>
                        <th>المرحلة</th>
                        <th>المسؤول</th>
                    </tr>
                    ${bimUses.map((u, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${u}</td>
                        <td>${_getBimUsePhase(data.bimSettings.uses[i])}</td>
                        <td>${_getBimUseResponsible(data.bimSettings.uses[i])}</td>
                    </tr>`).join('')}
                </table>

                ${bimUses.length > 0 ? `
                <h4>7.2 تفاصيل الاستخدامات</h4>
                ${data.bimSettings.uses.includes('ClashDetection') ? `
                <h4>كشف التعارضات (Clash Detection)</h4>
                <ul>
                    <li>يتم إجراء فحص التعارضات أسبوعياً على النموذج الفيدرالي</li>
                    <li>تصنيف التعارضات: حرجة / متوسطة / منخفضة</li>
                    <li>يتم توثيق جميع التعارضات في نظام BCF</li>
                    <li>الحد الأقصى لحل التعارضات الحرجة: 5 أيام عمل</li>
                    <li>يتم إعداد تقرير تعارضات شهري</li>
                </ul>` : ''}

                ${data.bimSettings.uses.includes('3DCoordination') ? `
                <h4>التنسيق ثلاثي الأبعاد (3D Coordination)</h4>
                <ul>
                    <li>اجتماعات تنسيق BIM أسبوعية</li>
                    <li>النموذج الفيدرالي يتم تحديثه قبل كل اجتماع</li>
                    <li>يتم استخدام نقطة أصل موحدة لجميع النماذج</li>
                    <li>فحص جودة النماذج قبل الدمج</li>
                </ul>` : ''}

                ${data.bimSettings.uses.includes('QuantityTakeoff') ? `
                <h4>حصر الكميات (Quantity Takeoff)</h4>
                <ul>
                    <li>يتم استخراج الكميات من النماذج في مراحل LOD 300 وما فوق</li>
                    <li>يجب التحقق من دقة الكميات مع المسوحات الميدانية</li>
                    <li>يتم تحديث جداول الكميات عند كل إصدار رئيسي</li>
                </ul>` : ''}
                ` : ''}
            `
        };
    }

    function _generateSection8() {
        return {
            number: 8,
            title: 'ضمان الجودة (Quality Assurance)',
            content: `
                <h4>8.1 إجراءات ضمان الجودة</h4>
                <p>يتم تطبيق عملية ضمان جودة متعددة المستويات لضمان دقة واتساق المعلومات:</p>

                <h4>8.2 فحوصات الجودة الداخلية (بواسطة فرق المهام)</h4>
                <ul>
                    <li>فحص التسمية: التأكد من اتباع معيار تسمية الملفات المعتمد</li>
                    <li>فحص التصنيف: التأكد من تصنيف جميع العناصر بشكل صحيح</li>
                    <li>فحص الهندسة: التأكد من عدم وجود تعارضات داخلية</li>
                    <li>فحص المعلومات: التأكد من استيفاء مستوى المعلومات المطلوب</li>
                    <li>فحص الإحداثيات: التأكد من استخدام نقطة الأصل الصحيحة</li>
                </ul>

                <h4>8.3 فحوصات مدير المعلومات</h4>
                <ul>
                    <li>مراجعة الالتزام بمعايير التسمية والتصنيف</li>
                    <li>فحص التوافق بين النماذج المختلفة</li>
                    <li>التحقق من اكتمال حزم المعلومات</li>
                    <li>فحص التعارضات بين التخصصات</li>
                </ul>

                <h4>8.4 قائمة مراجعة فحص الجودة</h4>
                <table>
                    <tr>
                        <th>#</th>
                        <th>بند الفحص</th>
                        <th>التكرار</th>
                        <th>المسؤول</th>
                    </tr>
                    <tr><td>1</td><td>تسمية الملفات</td><td>كل تسليم</td><td>فريق المهام</td></tr>
                    <tr><td>2</td><td>تصنيف العناصر</td><td>كل تسليم</td><td>فريق المهام</td></tr>
                    <tr><td>3</td><td>مستوى المعلومات</td><td>كل تسليم</td><td>مدير المعلومات</td></tr>
                    <tr><td>4</td><td>نظام الإحداثيات</td><td>كل تسليم</td><td>فريق المهام</td></tr>
                    <tr><td>5</td><td>كشف التعارضات</td><td>أسبوعي</td><td>الطرف الرئيسي</td></tr>
                    <tr><td>6</td><td>فحص IFC</td><td>كل تسليم</td><td>مدير المعلومات</td></tr>
                    <tr><td>7</td><td>اكتمال البيانات</td><td>كل مرحلة</td><td>مدير المعلومات</td></tr>
                    <tr><td>8</td><td>مطابقة المعايير</td><td>شهري</td><td>الطرف الرئيسي</td></tr>
                </table>

                <h4>8.5 إجراء عدم المطابقة</h4>
                <ol>
                    <li>توثيق عدم المطابقة في نظام BCF أو CDE</li>
                    <li>إبلاغ الفريق المسؤول</li>
                    <li>تحديد مهلة التصحيح (3-5 أيام عمل)</li>
                    <li>التحقق من التصحيح</li>
                    <li>إغلاق الملاحظة</li>
                </ol>
            `
        };
    }

    function _generateSection9(data) {
        return {
            number: 9,
            title: 'التسليمات والمراحل (Deliverables and Milestones)',
            content: `
                <h4>9.1 جدول المراحل الرئيسية</h4>
                <table>
                    <tr>
                        <th>المرحلة</th>
                        <th>التسليمات</th>
                        <th>التاريخ المستهدف</th>
                    </tr>
                    <tr>
                        <td>بدء المشروع</td>
                        <td>خطة تنفيذ BIM، قوالب المشروع، إعداد CDE</td>
                        <td>${_formatDate(data.projectInfo.startDate)}</td>
                    </tr>
                    <tr>
                        <td>التصميم المفاهيمي</td>
                        <td>نماذج LOD 100، تقرير الجدوى</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td>التصميم الأولي</td>
                        <td>نماذج LOD 200، تقديرات التكلفة الأولية</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td>التصميم التفصيلي</td>
                        <td>نماذج LOD 300، وثائق البناء، تقرير التعارضات</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td>التنسيق النهائي</td>
                        <td>النموذج الفيدرالي المنسق، تقرير صفر تعارضات</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td>التسليم النهائي</td>
                        <td>جميع النماذج النهائية، وثائق كما بُني</td>
                        <td>${_formatDate(data.projectInfo.endDate)}</td>
                    </tr>
                </table>

                <h4>9.2 التسليمات لكل تخصص</h4>
                <p>يتم تحديد التسليمات المطلوبة من كل فريق مهام في خطة TIDP الخاصة بهم، وتشمل بشكل عام:</p>
                <ul>
                    <li><strong>جميع التخصصات:</strong> نماذج BIM بالصيغة الأصلية + IFC، جداول العناصر، قائمة الكميات</li>
                    <li><strong>المعماري:</strong> نموذج معماري، رسومات تخطيطية، جداول الأبواب والنوافذ والتشطيبات</li>
                    <li><strong>الإنشائي:</strong> نموذج إنشائي، رسومات تفصيلية، جداول حديد التسليح</li>
                    <li><strong>MEP:</strong> نماذج الأنظمة الميكانيكية والكهربائية والصحية، مخططات الأنظمة</li>
                </ul>

                <h4>9.3 تقارير دورية</h4>
                <table>
                    <tr><th>التقرير</th><th>التكرار</th><th>المسؤول</th></tr>
                    <tr><td>تقرير حالة BIM</td><td>أسبوعي</td><td>مدير المعلومات</td></tr>
                    <tr><td>تقرير التعارضات</td><td>أسبوعي</td><td>الطرف الرئيسي</td></tr>
                    <tr><td>تقرير جودة النماذج</td><td>شهري</td><td>مدير المعلومات</td></tr>
                    <tr><td>تقرير تقدم المشروع</td><td>شهري</td><td>الطرف الرئيسي</td></tr>
                </table>

                <h4>9.4 تحديث AIM وفق الأحداث المحفزة (Trigger Events)</h4>
                <p>في مرحلة التشغيل، لا تُدار AIR كقائمة ثابتة. يتم تحديث AIM عند وقوع أحداث تشغيلية رئيسية وفق آلية حوكمة واضحة:</p>
                <table>
                    <tr><th>الحدث المحفز</th><th>نوع التحديث المطلوب في AIM</th><th>المسؤول</th><th>مهلة التحديث</th></tr>
                    <tr><td>استبدال أصل رئيسي</td><td>تحديث بيانات الأصل، الضمان، وسجل الصيانة</td><td>فريق التشغيل + مدير المعلومات</td><td>5 أيام عمل</td></tr>
                    <tr><td>صيانة طارئة</td><td>تسجيل العطل، الإجراء، ونتائج الاختبار بعد المعالجة</td><td>فريق التشغيل</td><td>48 ساعة</td></tr>
                    <tr><td>تعديل تشغيلي معتمد</td><td>تحديث النماذج والوثائق التشغيلية ذات العلاقة</td><td>الطرف الرئيسي/الاستشاري</td><td>7 أيام عمل</td></tr>
                    <tr><td>حادث أمني/تشغيلي</td><td>تحديث القيود الأمنية وسجل المخاطر وحقوق الوصول</td><td>مسؤول الأمن + مدير المعلومات</td><td>24 ساعة</td></tr>
                </table>
            `
        };
    }

    function _generateSection10() {
        return {
            number: 10,
            title: 'إدارة المخاطر (Risk Management)',
            content: `
                <h4>10.1 مخاطر إدارة المعلومات</h4>
                <table>
                    <tr>
                        <th>#</th>
                        <th>المخاطرة</th>
                        <th>الاحتمالية</th>
                        <th>التأثير</th>
                        <th>إجراء التخفيف</th>
                    </tr>
                    <tr>
                        <td>1</td>
                        <td>عدم توافق إصدارات البرامج</td>
                        <td>متوسط</td>
                        <td>عالي</td>
                        <td>توحيد الإصدارات والتحقق قبل التبادل</td>
                    </tr>
                    <tr>
                        <td>2</td>
                        <td>فقدان البيانات</td>
                        <td>منخفض</td>
                        <td>حرج</td>
                        <td>نسخ احتياطي يومي واختبار دوري للاستعادة</td>
                    </tr>
                    <tr>
                        <td>3</td>
                        <td>عدم الالتزام بمعايير التسمية</td>
                        <td>عالي</td>
                        <td>متوسط</td>
                        <td>أدوات تحقق آلية وتدريب الفرق</td>
                    </tr>
                    <tr>
                        <td>4</td>
                        <td>تعارضات غير مكتشفة</td>
                        <td>متوسط</td>
                        <td>عالي</td>
                        <td>فحوصات أسبوعية ومعايير فحص محددة</td>
                    </tr>
                    <tr>
                        <td>5</td>
                        <td>تأخر تسليم المعلومات</td>
                        <td>متوسط</td>
                        <td>عالي</td>
                        <td>متابعة دورية وإنذارات مبكرة</td>
                    </tr>
                    <tr>
                        <td>6</td>
                        <td>نقص الكفاءات التقنية</td>
                        <td>متوسط</td>
                        <td>متوسط</td>
                        <td>برامج تدريب وتأهيل مستمرة</td>
                    </tr>
                    <tr>
                        <td>7</td>
                        <td>مشاكل أمن المعلومات</td>
                        <td>منخفض</td>
                        <td>حرج</td>
                        <td>سياسة أمنية وصلاحيات وصول محددة</td>
                    </tr>
                    <tr>
                        <td>8</td>
                        <td>فقدان جودة تحويل IFC</td>
                        <td>متوسط</td>
                        <td>متوسط</td>
                        <td>اختبار التحويل والتحقق من جودة IFC</td>
                    </tr>
                </table>

                <h4>10.2 خطة الاستجابة</h4>
                <ul>
                    <li><strong>المخاطر الحرجة:</strong> إبلاغ فوري للطرف المعيّن واجتماع طوارئ خلال 24 ساعة</li>
                    <li><strong>المخاطر العالية:</strong> إبلاغ خلال يوم عمل وخطة تصحيح خلال 3 أيام</li>
                    <li><strong>المخاطر المتوسطة:</strong> توثيق وإدراج في التقرير الأسبوعي</li>
                    <li><strong>المخاطر المنخفضة:</strong> مراقبة ومتابعة دورية</li>
                </ul>

                <h4>10.3 سجل المخاطر</h4>
                <p>يتم الاحتفاظ بسجل مخاطر حي في CDE ويتم مراجعته شهرياً مع تحديث الحالة وإضافة مخاطر جديدة عند تحديدها.</p>
            `
        };
    }

    function _generateSection11() {
        return {
            number: 11,
            title: 'أمن المعلومات (Information Security)',
            content: `
                <h4>11.1 سياسة أمن المعلومات (وفقاً لـ ISO 19650-5)</h4>
                <p>يتم تطبيق متطلبات أمن المعلومات وفقاً للجزء الخامس من معيار ISO 19650:</p>

                <h4>11.2 تصنيف المعلومات</h4>
                <table>
                    <tr><th>التصنيف</th><th>الوصف</th><th>إجراءات الحماية</th></tr>
                    <tr>
                        <td>عام</td>
                        <td>معلومات متاحة لجميع أطراف المشروع</td>
                        <td>حماية أساسية</td>
                    </tr>
                    <tr>
                        <td>محدود</td>
                        <td>معلومات متاحة لأطراف محددة فقط</td>
                        <td>تشفير + صلاحيات وصول</td>
                    </tr>
                    <tr>
                        <td>سري</td>
                        <td>معلومات حساسة تتطلب حماية عالية</td>
                        <td>تشفير + وصول محدود + تدقيق</td>
                    </tr>
                </table>

                <h4>11.3 إجراءات الأمان</h4>
                <ul>
                    <li>استخدام المصادقة الثنائية (2FA) للوصول إلى CDE</li>
                    <li>مراجعة صلاحيات الوصول شهرياً</li>
                    <li>تشفير جميع البيانات المنقولة عبر الشبكة</li>
                    <li>تسجيل جميع عمليات الوصول والتعديل</li>
                    <li>إلغاء الوصول فوراً عند مغادرة أي فرد للمشروع</li>
                </ul>

                <h4>11.4 ترياج الحساسية (Sensitivity Triage)</h4>
                <p>يتم تصنيف الأصول المعلوماتية وفق حساسية الاستخدام والتهديد المحتمل لتحديد مستوى الحماية المطلوب:</p>
                <table>
                    <tr><th>المستوى</th><th>دلالة الحساسية</th><th>متطلبات الحماية</th></tr>
                    <tr><td>ST1</td><td>حساسية منخفضة</td><td>ضوابط وصول قياسية وتسجيل نشاط أساسي</td></tr>
                    <tr><td>ST2</td><td>حساسية متوسطة</td><td>مراجعة وصول دورية + تشفير أثناء النقل والتخزين</td></tr>
                    <tr><td>ST3</td><td>حساسية عالية</td><td>وصول قائم على الحاجة فقط + تدقيق تفصيلي + فصل بيئات</td></tr>
                    <tr><td>ST4</td><td>حساسية حرجة</td><td>ضوابط مشددة، موافقات متعددة، وخطة استجابة أمنية فورية</td></tr>
                </table>
            `
        };
    }

    function _getBimUsePhase(use) {
        const phases = {
            '3DCoordination': 'جميع المراحل',
            'ClashDetection': 'التصميم التفصيلي فما بعد',
            'QuantityTakeoff': 'التصميم الأولي فما بعد',
            '4DScheduling': 'التنفيذ',
            '5DCostEstimation': 'التصميم الأولي فما بعد',
            'EnergyAnalysis': 'التصميم المفاهيمي والأولي',
            'FacilityManagement': 'ما بعد التسليم',
            'Visualization': 'جميع المراحل',
            'AsBuilt': 'مرحلة التسليم'
        };
        return phases[use] || 'سيتم تحديدها';
    }

    function _getBimUseResponsible(use) {
        const resp = {
            '3DCoordination': 'الطرف الرئيسي',
            'ClashDetection': 'الطرف الرئيسي',
            'QuantityTakeoff': 'فرق المهام',
            '4DScheduling': 'الطرف الرئيسي',
            '5DCostEstimation': 'الطرف الرئيسي',
            'EnergyAnalysis': 'فريق MEP',
            'FacilityManagement': 'مدير المرافق',
            'Visualization': 'فرق المهام',
            'AsBuilt': 'فرق المهام + المقاول'
        };
        return resp[use] || 'سيتم تحديده';
    }

    function _getBimUsePhaseEN(use) {
        const phases = {
            '3DCoordination': 'All Phases',
            'ClashDetection': 'Detailed Design onwards',
            'QuantityTakeoff': 'Preliminary Design onwards',
            '4DScheduling': 'Construction Phase',
            '5DCostEstimation': 'Preliminary Design onwards',
            'EnergyAnalysis': 'Concept & Preliminary Design',
            'FacilityManagement': 'Post-Handover',
            'Visualization': 'All Phases',
            'AsBuilt': 'Handover Phase'
        };
        return phases[use] || 'To be determined';
    }

    function _getBimUseResponsibleEN(use) {
        const resp = {
            '3DCoordination': 'Lead Appointed Party',
            'ClashDetection': 'Lead Appointed Party',
            'QuantityTakeoff': 'Task Teams',
            '4DScheduling': 'Lead Appointed Party',
            '5DCostEstimation': 'Lead Appointed Party',
            'EnergyAnalysis': 'MEP Team',
            'FacilityManagement': 'Facility Manager',
            'Visualization': 'Task Teams',
            'AsBuilt': 'Task Teams + Contractor'
        };
        return resp[use] || 'To be determined';
    }

    // ========== ENGLISH PLAN GENERATION ==========
    function _generateSection1EN(data) {
        return {
            number: 1,
            title: 'Project Information',
            content: `
                <h4>1.1 Basic Project Data</h4>
                <table>
                    <tr><th>Project Name</th><td>${_esc(data.projectInfo.name)}</td></tr>
                    <tr><th>Project Number</th><td>${_esc(data.projectInfo.number) || 'Not specified'}</td></tr>
                    <tr><th>Project Location</th><td>${_esc(data.projectInfo.location)}</td></tr>
                    <tr><th>Client Name</th><td>${_esc(data.projectInfo.client)}</td></tr>
                    <tr><th>Project Type</th><td>${projectTypeNamesEN[data.projectInfo.type] || data.projectInfo.type}</td></tr>
                    <tr><th>Project Scale</th><td>${scaleNamesEN[data.projectInfo.scale] || 'Not specified'}</td></tr>
                    <tr><th>Start Date</th><td>${_formatDateEN(data.projectInfo.startDate)}</td></tr>
                    <tr><th>End Date</th><td>${_formatDateEN(data.projectInfo.endDate)}</td></tr>
                </table>

                <h4>1.2 Project Description</h4>
                <p>${_esc(data.projectInfo.description) || 'No detailed project description provided.'}</p>

                <h4>1.3 BIM Execution Plan Scope</h4>
                <p>This document defines the BIM Execution Plan (BEP) for the "${_esc(data.projectInfo.name)}" project in accordance with ISO 19650 requirements. The plan covers all project lifecycle stages from concept design to handover, and defines the procedures, standards, and roles required for effective information management.</p>

                <h4>1.4 Standards and References</h4>
                <ul>
                    <li>ISO 19650-1:2018 — Organization and digitization of information about buildings and civil engineering works — Part 1: Concepts and principles</li>
                    <li>ISO 19650-2:2018 — Part 2: Delivery phase of the assets</li>
                    <li>ISO 19650-3:2020 — Part 3: Operational phase of the assets</li>
                    <li>ISO 19650-5:2020 — Part 5: Security-minded approach to information management</li>
                </ul>

                <h4>1.5 Strategic Information Management Perspectives (ISO 19650-1)</h4>
                <p>This plan adopts four integrated perspectives to ensure information production supports real asset value and decision-making quality:</p>
                <ul>
                    <li><strong>Owner Perspective:</strong> Information supports business objectives and investment decisions.</li>
                    <li><strong>User Perspective:</strong> Information supports usability, safety, and operational performance.</li>
                    <li><strong>Delivery Perspective:</strong> Information enables efficient design and construction collaboration.</li>
                    <li><strong>Society Perspective:</strong> Information reflects regulatory, sustainability, and social-impact needs.</li>
                </ul>
            `
        };
    }

    function _generateSection2EN(data) {
        let teamsTable = '';
        if (data.teams && data.teams.length > 0) {
            teamsTable = `
                <h4>2.4 Task Teams</h4>
                <table>
                    <tr><th>Team</th><th>Company</th><th>Discipline</th><th>Email</th></tr>
                    ${data.teams.map((t, i) => `
                    <tr>
                        <td>${_esc(t.name) || 'Task Team ' + (i + 1)}</td>
                        <td>${_esc(t.company) || '-'}</td>
                        <td>${disciplineNamesEN[t.discipline] || t.discipline}</td>
                        <td>${_esc(t.email) || '-'}</td>
                    </tr>`).join('')}
                </table>
            `;
        }

        return {
            number: 2,
            title: 'Roles and Responsibilities',
            content: `
                <p>In accordance with ISO 19650, the following roles and responsibilities are defined for information management on this project:</p>

                <h4>2.1 Appointing Party</h4>
                <table>
                    <tr><th>Organization</th><td>${_esc(data.roles.appointingParty.name) || _esc(data.projectInfo.client)}</td></tr>
                    <tr><th>Email</th><td>${_esc(data.roles.appointingParty.contact) || '-'}</td></tr>
                </table>
                <p><strong>Responsibilities:</strong></p>
                <ul>
                    <li>Define Organizational Information Requirements (OIR)</li>
                    <li>Prepare Exchange Information Requirements (EIR)</li>
                    <li>Evaluate BIM Execution Plans submitted by appointed parties</li>
                    <li>Accept delivered information packages</li>
                    <li>Ensure information compliance with defined standards</li>
                </ul>

                <h4>2.2 Lead Appointed Party</h4>
                <table>
                    <tr><th>Organization</th><td>${_esc(data.roles.leadAP.name) || '-'}</td></tr>
                    <tr><th>Email</th><td>${_esc(data.roles.leadAP.contact) || '-'}</td></tr>
                </table>
                <p><strong>Responsibilities:</strong></p>
                <ul>
                    <li>Prepare the pre-appointment BIM Execution Plan (BEP)</li>
                    <li>Coordinate task team activities</li>
                    <li>Ensure information consistency across all parties</li>
                    <li>Manage the federated model assembly process</li>
                    <li>Quality control and standards compliance</li>
                </ul>

                <h4>2.3 Information Manager</h4>
                <table>
                    <tr><th>Name</th><td>${_esc(data.roles.infoManager.name) || 'To be determined'}</td></tr>
                    <tr><th>Email</th><td>${_esc(data.roles.infoManager.contact) || '-'}</td></tr>
                </table>
                <p><strong>Responsibilities:</strong></p>
                <ul>
                    <li>Common Data Environment (CDE) management</li>
                    <li>Monitor compliance with naming and classification standards</li>
                    <li>Manage review and approval workflows</li>
                    <li>Coordinate between parties to resolve information issues</li>
                    <li>Produce periodic information status reports</li>
                </ul>

                ${teamsTable}

                <h4>2.5 RACI Matrix</h4>
                <table>
                    <tr><th>Task</th><th>Appointing Party</th><th>Lead AP</th><th>Info Manager</th><th>Task Teams</th></tr>
                    <tr><td>Define EIR</td><td>R/A</td><td>C</td><td>C</td><td>I</td></tr>
                    <tr><td>Prepare BEP</td><td>A</td><td>R</td><td>C</td><td>C</td></tr>
                    <tr><td>Manage CDE</td><td>I</td><td>A</td><td>R</td><td>C</td></tr>
                    <tr><td>Produce Models</td><td>I</td><td>A</td><td>C</td><td>R</td></tr>
                    <tr><td>Quality Review</td><td>A</td><td>R</td><td>R</td><td>C</td></tr>
                    <tr><td>Clash Detection</td><td>I</td><td>R/A</td><td>C</td><td>R</td></tr>
                    <tr><td>Information Delivery</td><td>A</td><td>R</td><td>R</td><td>C</td></tr>
                </table>
                <p><small>R = Responsible | A = Accountable | C = Consulted | I = Informed</small></p>

                <h4>2.6 Capability & Capacity Assessment</h4>
                <table>
                    <tr><th>Assessment Criterion</th><th>Description</th><th>Verification Method</th></tr>
                    <tr><td>Technical Capability</td><td>Team competence in ISO 19650 and BIM workflows</td><td>CVs + references + certifications</td></tr>
                    <tr><td>Operational Capacity</td><td>Availability of resources to meet delivery program</td><td>Resource plan + workload + commitment evidence</td></tr>
                    <tr><td>Governance Capability</td><td>Internal QA/QC and review controls</td><td>Documented procedures + checklists + sample reports</td></tr>
                    <tr><td>Exchange Readiness</td><td>Ability to exchange compliant information (IFC/BCF)</td><td>Pre-appointment exchange test</td></tr>
                </table>

                <h4>2.7 Detailed Responsibility Matrix by Information Container</h4>
                <table>
                    <tr><th>Information Container</th><th>Originator</th><th>Internal Checker</th><th>Reviewer</th><th>Publisher/Approver</th></tr>
                    <tr><td>Architectural Model</td><td>Architecture Team</td><td>Team Lead</td><td>Information Manager</td><td>Lead AP</td></tr>
                    <tr><td>Structural Model</td><td>Structural Team</td><td>Team Lead</td><td>Information Manager</td><td>Lead AP</td></tr>
                    <tr><td>MEP Model</td><td>MEP Team</td><td>Team Lead</td><td>Information Manager</td><td>Lead AP</td></tr>
                    <tr><td>Federated Model</td><td>Lead AP</td><td>BIM Coordinator</td><td>Information Manager</td><td>Appointing Party</td></tr>
                    <tr><td>Final Handover Information (AIM inputs)</td><td>Task Teams</td><td>Lead AP</td><td>Information Manager</td><td>Appointing Party</td></tr>
                </table>
            `
        };
    }

    function _generateSection3EN(data) {
        const cdeNames = {
            'ACC': 'Autodesk Construction Cloud',
            'Aconex': 'Oracle Aconex',
            'ProjectWise': 'Bentley ProjectWise',
            'Trimble': 'Trimble Connect',
            'SharePoint': 'SharePoint',
            'Nextcloud': 'Nextcloud',
            'custom': 'Custom System'
        };

        return {
            number: 3,
            title: 'Common Data Environment (CDE)',
            content: `
                <h4>3.1 Approved CDE System</h4>
                <p>The project will use <strong>${cdeNames[data.technical.cde] || data.technical.cde || 'To be determined'}</strong> as the Common Data Environment in accordance with ISO 19650.</p>

                <h4>3.2 CDE Workflow</h4>
                <p>The CDE workflow follows the four states defined in ISO 19650:</p>
                <table>
                    <tr><th>State</th><th>Status</th><th>Description</th><th>Responsible</th></tr>
                    <tr><td>Work in Progress</td><td>WIP</td><td>Individual team working area for information development</td><td>Task Teams</td></tr>
                    <tr><td>Shared</td><td>SHARED</td><td>Information available for coordination between teams</td><td>Information Manager</td></tr>
                    <tr><td>Published</td><td>PUBLISHED</td><td>Approved information available to all parties</td><td>Lead Appointed Party</td></tr>
                    <tr><td>Archived</td><td>ARCHIVED</td><td>Information preserved as project record</td><td>Information Manager</td></tr>
                </table>

                <h4>3.3 Review and Approval Protocol</h4>
                <ul>
                    <li><strong>WIP to SHARED:</strong> By information originator after passing internal quality checks</li>
                    <li><strong>SHARED to PUBLISHED:</strong> Requires approval from Information Manager and Lead Appointed Party</li>
                    <li><strong>Review:</strong> Must be completed within 5 working days maximum</li>
                    <li><strong>Revisions:</strong> All previous versions are maintained with modification dates</li>
                </ul>

                <h4>3.4 Folder Structure</h4>
                <ul>
                    <li><strong>/[Project No.]/WIP/[Discipline]/</strong> — Work in progress files</li>
                    <li><strong>/[Project No.]/SHARED/[Discipline]/</strong> — Shared files</li>
                    <li><strong>/[Project No.]/PUBLISHED/[Discipline]/</strong> — Approved files</li>
                    <li><strong>/[Project No.]/ARCHIVED/</strong> — Archive</li>
                </ul>

                <h4>3.5 Access Permissions</h4>
                <table>
                    <tr><th>Role</th><th>WIP</th><th>SHARED</th><th>PUBLISHED</th><th>ARCHIVED</th></tr>
                    <tr><td>Appointing Party</td><td>—</td><td>Read</td><td>Read</td><td>Read</td></tr>
                    <tr><td>Lead AP</td><td>Read</td><td>Read/Write</td><td>Read/Write</td><td>Read</td></tr>
                    <tr><td>Info Manager</td><td>Read</td><td>Read/Write</td><td>Read/Write</td><td>Read/Write</td></tr>
                    <tr><td>Task Teams</td><td>Read/Write (own team)</td><td>Read</td><td>Read</td><td>—</td></tr>
                </table>

                <h4>3.6 Metadata Governance</h4>
                <p>This CDE is managed as a metadata system, not only a folder tree. Each information container shall include mandatory attributes before publication:</p>
                <table>
                    <tr><th>Attribute</th><th>Purpose</th><th>Mandatory Before Publish</th></tr>
                    <tr><td>Revision Code</td><td>Version/change traceability</td><td>Yes</td></tr>
                    <tr><td>Status Code</td><td>Defines suitability for use and workflow state</td><td>Yes</td></tr>
                    <tr><td>Originator</td><td>Identifies information authoring organization</td><td>Yes</td></tr>
                    <tr><td>Container ID</td><td>Unique information container identifier</td><td>Yes</td></tr>
                    <tr><td>Approval Record</td><td>Evidence of review/approval path</td><td>Yes</td></tr>
                </table>
            `
        };
    }

    function _generateSection4EN(data) {
        const lods = data.bimSettings.lods || ['100', '200', '300'];
        const lodRows = lods.map(l => `<tr><td>LOD ${l}</td><td>${lodDescriptionsEN[l] || '-'}</td></tr>`).join('');

        return {
            number: 4,
            title: 'Information Delivery Strategy',
            content: `
                <h4>4.1 Level of Information Need</h4>
                <p>The levels of information development are defined based on project requirements and various stages:</p>
                <table><tr><th>Level</th><th>Description</th></tr>${lodRows}</table>

                <h4>4.2 Delivery Stages</h4>
                <table>
                    <tr><th>Stage</th><th>Information Level</th><th>Key Deliverables</th></tr>
                    <tr><td>Concept Design</td><td>LOD 100</td><td>Concept model, Feasibility study</td></tr>
                    <tr><td>Preliminary Design</td><td>LOD 200</td><td>Preliminary models, Cost estimates</td></tr>
                    <tr><td>Detailed Design</td><td>LOD 300</td><td>Detailed models, Construction documents</td></tr>
                    <tr><td>Coordination</td><td>LOD 350</td><td>Federated model, Clash reports</td></tr>
                    ${lods.includes('400') ? '<tr><td>Fabrication</td><td>LOD 400</td><td>Fabrication models, Installation details</td></tr>' : ''}
                    ${lods.includes('500') ? '<tr><td>As-Built</td><td>LOD 500</td><td>As-Built model, Operations data</td></tr>' : ''}
                </table>

                <h4>4.3 Master Information Delivery Plan (MIDP)</h4>
                <ul>
                    <li>Define information packages required for each stage</li>
                    <li>Target delivery dates</li>
                    <li>Responsible party for each information package</li>
                    <li>Acceptance criteria for each delivery</li>
                    <li>Information dependencies between teams</li>
                </ul>

                <h4>4.4 Task Information Delivery Plan (TIDP)</h4>
                <ul>
                    <li>List of models and documents assigned to the team</li>
                    <li>Delivery schedule</li>
                    <li>Internal quality assurance protocols</li>
                    <li>Coordination points with other teams</li>
                </ul>

                <h4>4.5 ISO 19650-2 Delivery Workflow</h4>
                <ol>
                    <li>Define appointment-level information requirements.</li>
                    <li>Issue Invitation to Tender with clear information requirements package.</li>
                    <li>Evaluate tender responses for capability and capacity.</li>
                    <li>Formal appointment and role confirmation.</li>
                    <li>Develop pre/post-appointment BEP.</li>
                    <li>Prepare MIDP/TIDP and align inter-team dependencies.</li>
                    <li>Produce information, self-check, and review through CDE gates.</li>
                    <li>Formally accept and approve information deliverables.</li>
                </ol>
            `
        };
    }

    function _generateSection5EN(data) {
        const softwareList = (data.technical.software || []).join(', ') || 'To be determined';
        const formats = (data.technical.formats || []).join(', ') || 'IFC';

        return {
            number: 5,
            title: 'Information Standards and Methods',
            content: `
                <h4>5.1 File Naming Convention</h4>
                <p>The file naming convention follows ${data.bimSettings.naming === 'iso19650' ? 'ISO 19650' : data.bimSettings.naming === 'bs1192' ? 'BS 1192' : 'a custom standard'}:</p>
                <p><strong>Format:</strong> [Project]-[Originator]-[Zone]-[Level]-[Type]-[Role]-[Number]-[Status]</p>
                <p><strong>Example:</strong> ${_esc(data.projectInfo.number) || 'PRJ001'}-ARC-ZZ-01-M3-A-0001-S2</p>
                <table>
                    <tr><th>Field</th><th>Description</th><th>Example</th></tr>
                    <tr><td>Project</td><td>Project code</td><td>${_esc(data.projectInfo.number) || 'PRJ001'}</td></tr>
                    <tr><td>Originator</td><td>Originating organization code</td><td>ARC, STR, MEP</td></tr>
                    <tr><td>Zone</td><td>Area or building</td><td>ZZ (All), B1, B2</td></tr>
                    <tr><td>Level</td><td>Floor number</td><td>01, 02, RF</td></tr>
                    <tr><td>Type</td><td>Information type</td><td>M3 (3D Model), DR (Drawing)</td></tr>
                    <tr><td>Role</td><td>Discipline</td><td>A (Arch), S (Struct)</td></tr>
                    <tr><td>Number</td><td>Sequential number</td><td>0001</td></tr>
                    <tr><td>Status</td><td>Document status</td><td>S0 (WIP), S2 (Shared)</td></tr>
                </table>

                <h4>5.2 Classification System</h4>
                <p>The project uses <strong>${data.bimSettings.classification === 'uniclass' ? 'Uniclass 2015' : data.bimSettings.classification === 'omniclass' ? 'OmniClass' : data.bimSettings.classification === 'masterformat' ? 'MasterFormat' : 'Custom'}</strong> for model element classification.</p>

                <h4>5.3 Units and Coordinate System</h4>
                <table>
                    <tr><th>Unit System</th><td>${data.technical.units === 'metric' ? 'Metric (meters, millimeters)' : 'Imperial (feet, inches)'}</td></tr>
                    <tr><th>Coordinate System</th><td>${_esc(data.technical.coordinates) || 'To be defined at project start'}</td></tr>
                    <tr><th>Origin Point</th><td>To be defined, documented, and shared with all teams</td></tr>
                </table>

                <h4>5.4 Modeling Standards</h4>
                <ul>
                    <li>All elements must be classified per the approved classification system</li>
                    <li>Unified project templates defined by the Lead Appointed Party must be used</li>
                    <li>Models must be free of unnecessary and duplicate elements</li>
                    <li>Element status must be updated at each delivery</li>
                    <li>IFC standard must be used for inter-software exchange</li>
                </ul>

                <h4>5.5 Approved Exchange Formats</h4>
                <p><strong>Approved Formats:</strong> ${formats}</p>
                <ul>
                    <li><strong>IFC:</strong> Used for all model exchanges between different software (IFC 4.0 or later)</li>
                    <li><strong>Native Formats:</strong> Maintained in WIP folder and shared on request</li>
                    <li><strong>PDF:</strong> For all approved drawings and documents</li>
                </ul>
            `
        };
    }

    function _generateSection6EN(data) {
        const softwareList = (data.technical.software || []).join(', ') || 'To be determined';
        const coordTools = (data.technical.coordination || []).join(', ') || 'To be determined';

        return {
            number: 6,
            title: 'Technology Infrastructure',
            content: `
                <h4>6.1 BIM Authoring Tools</h4>
                <p><strong>Approved Software:</strong> ${softwareList}</p>
                <p>All task teams must use compatible versions of the approved software to ensure seamless information exchange.</p>

                <h4>6.2 Coordination and Review Tools</h4>
                <p><strong>Approved Tools:</strong> ${coordTools}</p>

                <h4>6.3 Technical Requirements</h4>
                <table>
                    <tr><th>Requirement</th><th>Minimum</th><th>Recommended</th></tr>
                    <tr><td>Processor</td><td>Intel i7 / AMD Ryzen 7</td><td>Intel i9 / AMD Ryzen 9</td></tr>
                    <tr><td>Memory</td><td>16 GB RAM</td><td>32+ GB RAM</td></tr>
                    <tr><td>Graphics</td><td>NVIDIA GTX 1660 / equivalent</td><td>NVIDIA RTX 3070+ / equivalent</td></tr>
                    <tr><td>Storage</td><td>SSD 512 GB</td><td>NVMe SSD 1 TB+</td></tr>
                    <tr><td>Network</td><td>50 Mbps</td><td>100+ Mbps</td></tr>
                </table>

                <h4>6.4 Backup</h4>
                <ul>
                    <li>Automatic daily backup of all CDE data</li>
                    <li>Backups retained for minimum 90 days</li>
                    <li>Data recovery tested periodically (every 3 months)</li>
                    <li>Each team must maintain local backups of WIP files</li>
                </ul>
            `
        };
    }

    function _generateSection7EN(data) {
        const bimUses = (data.bimSettings.uses || []).map(u => bimUseNamesEN[u] || u);

        return {
            number: 7,
            title: 'BIM Uses',
            content: `
                <h4>7.1 Approved BIM Uses for the Project</h4>
                <table>
                    <tr><th>#</th><th>BIM Use</th><th>Phase</th><th>Responsible</th></tr>
                    ${bimUses.map((u, i) => `
                    <tr><td>${i + 1}</td><td>${u}</td><td>${_getBimUsePhaseEN(data.bimSettings.uses[i])}</td><td>${_getBimUseResponsibleEN(data.bimSettings.uses[i])}</td></tr>`).join('')}
                </table>

                ${bimUses.length > 0 ? `
                <h4>7.2 Use Details</h4>
                ${data.bimSettings.uses.includes('ClashDetection') ? `
                <h4>Clash Detection</h4>
                <ul>
                    <li>Weekly clash detection on the federated model</li>
                    <li>Clash classification: Critical / Medium / Low</li>
                    <li>All clashes documented in BCF system</li>
                    <li>Maximum resolution time for critical clashes: 5 working days</li>
                    <li>Monthly clash report prepared</li>
                </ul>` : ''}
                ${data.bimSettings.uses.includes('3DCoordination') ? `
                <h4>3D Coordination</h4>
                <ul>
                    <li>Weekly BIM coordination meetings</li>
                    <li>Federated model updated before each meeting</li>
                    <li>Unified origin point for all models</li>
                    <li>Model quality check before federation</li>
                </ul>` : ''}
                ${data.bimSettings.uses.includes('QuantityTakeoff') ? `
                <h4>Quantity Takeoff</h4>
                <ul>
                    <li>Quantities extracted from models at LOD 300 and above</li>
                    <li>Quantities verified against field surveys</li>
                    <li>Quantity schedules updated at each major release</li>
                </ul>` : ''}
                ` : ''}
            `
        };
    }

    function _generateSection8EN() {
        return {
            number: 8,
            title: 'Quality Assurance',
            content: `
                <h4>8.1 Quality Assurance Procedures</h4>
                <p>A multi-level quality assurance process is applied to ensure information accuracy and consistency:</p>

                <h4>8.2 Internal Quality Checks (by Task Teams)</h4>
                <ul>
                    <li>Naming check: Verify compliance with the approved file naming convention</li>
                    <li>Classification check: Verify all elements are correctly classified</li>
                    <li>Geometry check: Verify no internal clashes</li>
                    <li>Information check: Verify required information level is met</li>
                    <li>Coordinate check: Verify correct origin point is used</li>
                </ul>

                <h4>8.3 Information Manager Checks</h4>
                <ul>
                    <li>Review compliance with naming and classification standards</li>
                    <li>Check compatibility between different models</li>
                    <li>Verify completeness of information packages</li>
                    <li>Inter-discipline clash detection</li>
                </ul>

                <h4>8.4 Quality Check Checklist</h4>
                <table>
                    <tr><th>#</th><th>Check Item</th><th>Frequency</th><th>Responsible</th></tr>
                    <tr><td>1</td><td>File naming</td><td>Every delivery</td><td>Task Team</td></tr>
                    <tr><td>2</td><td>Element classification</td><td>Every delivery</td><td>Task Team</td></tr>
                    <tr><td>3</td><td>Information level</td><td>Every delivery</td><td>Info Manager</td></tr>
                    <tr><td>4</td><td>Coordinate system</td><td>Every delivery</td><td>Task Team</td></tr>
                    <tr><td>5</td><td>Clash detection</td><td>Weekly</td><td>Lead AP</td></tr>
                    <tr><td>6</td><td>IFC validation</td><td>Every delivery</td><td>Info Manager</td></tr>
                    <tr><td>7</td><td>Data completeness</td><td>Per phase</td><td>Info Manager</td></tr>
                    <tr><td>8</td><td>Standards compliance</td><td>Monthly</td><td>Lead AP</td></tr>
                </table>

                <h4>8.5 Non-Conformance Procedure</h4>
                <ol>
                    <li>Document non-conformance in BCF or CDE system</li>
                    <li>Notify the responsible team</li>
                    <li>Set correction deadline (3–5 working days)</li>
                    <li>Verify correction</li>
                    <li>Close the issue</li>
                </ol>
            `
        };
    }

    function _generateSection9EN(data) {
        return {
            number: 9,
            title: 'Deliverables and Milestones',
            content: `
                <h4>9.1 Key Milestones Schedule</h4>
                <table>
                    <tr><th>Milestone</th><th>Deliverables</th><th>Target Date</th></tr>
                    <tr><td>Project Start</td><td>BIM Execution Plan, Project templates, CDE setup</td><td>${_formatDateEN(data.projectInfo.startDate)}</td></tr>
                    <tr><td>Concept Design</td><td>LOD 100 models, Feasibility report</td><td>—</td></tr>
                    <tr><td>Preliminary Design</td><td>LOD 200 models, Initial cost estimates</td><td>—</td></tr>
                    <tr><td>Detailed Design</td><td>LOD 300 models, Construction documents, Clash report</td><td>—</td></tr>
                    <tr><td>Final Coordination</td><td>Coordinated federated model, Zero-clash report</td><td>—</td></tr>
                    <tr><td>Final Delivery</td><td>All final models, As-built documents</td><td>${_formatDateEN(data.projectInfo.endDate)}</td></tr>
                </table>

                <h4>9.2 Deliverables per Discipline</h4>
                <ul>
                    <li><strong>All Disciplines:</strong> BIM models (native + IFC), Element schedules, Quantity lists</li>
                    <li><strong>Architecture:</strong> Architectural model, Layout drawings, Door/Window/Finish schedules</li>
                    <li><strong>Structural:</strong> Structural model, Detail drawings, Rebar schedules</li>
                    <li><strong>MEP:</strong> MEP system models, System diagrams</li>
                </ul>

                <h4>9.3 Periodic Reports</h4>
                <table>
                    <tr><th>Report</th><th>Frequency</th><th>Responsible</th></tr>
                    <tr><td>BIM Status Report</td><td>Weekly</td><td>Info Manager</td></tr>
                    <tr><td>Clash Report</td><td>Weekly</td><td>Lead AP</td></tr>
                    <tr><td>Model Quality Report</td><td>Monthly</td><td>Info Manager</td></tr>
                    <tr><td>Progress Report</td><td>Monthly</td><td>Lead AP</td></tr>
                </table>

                <h4>9.4 AIM Update Triggers (Operational Events)</h4>
                <p>During operations, AIR is treated as a dynamic requirement set. AIM shall be updated when operational trigger events occur:</p>
                <table>
                    <tr><th>Trigger Event</th><th>Required AIM Update</th><th>Responsible</th><th>Update SLA</th></tr>
                    <tr><td>Major asset replacement</td><td>Update asset data, warranty and maintenance records</td><td>Operations Team + Info Manager</td><td>5 working days</td></tr>
                    <tr><td>Emergency maintenance</td><td>Log incident, intervention, and post-fix test results</td><td>Operations Team</td><td>48 hours</td></tr>
                    <tr><td>Approved operational change</td><td>Update related models and O&amp;M documents</td><td>Lead AP/Consultant</td><td>7 working days</td></tr>
                    <tr><td>Security/operational incident</td><td>Update restrictions, risk log, and access controls</td><td>Security Lead + Info Manager</td><td>24 hours</td></tr>
                </table>
            `
        };
    }

    function _generateSection10EN() {
        return {
            number: 10,
            title: 'Risk Management',
            content: `
                <h4>10.1 Information Management Risks</h4>
                <table>
                    <tr><th>#</th><th>Risk</th><th>Probability</th><th>Impact</th><th>Mitigation</th></tr>
                    <tr><td>1</td><td>Software version incompatibility</td><td>Medium</td><td>High</td><td>Standardize versions and verify before exchange</td></tr>
                    <tr><td>2</td><td>Data loss</td><td>Low</td><td>Critical</td><td>Daily backup and periodic recovery testing</td></tr>
                    <tr><td>3</td><td>Naming standard non-compliance</td><td>High</td><td>Medium</td><td>Automated validation tools and team training</td></tr>
                    <tr><td>4</td><td>Undetected clashes</td><td>Medium</td><td>High</td><td>Weekly checks with defined criteria</td></tr>
                    <tr><td>5</td><td>Late information delivery</td><td>Medium</td><td>High</td><td>Regular follow-up and early warnings</td></tr>
                    <tr><td>6</td><td>Lack of technical competency</td><td>Medium</td><td>Medium</td><td>Ongoing training and qualification programs</td></tr>
                    <tr><td>7</td><td>Information security issues</td><td>Low</td><td>Critical</td><td>Security policy and defined access permissions</td></tr>
                    <tr><td>8</td><td>IFC conversion quality loss</td><td>Medium</td><td>Medium</td><td>Test conversions and verify IFC quality</td></tr>
                </table>

                <h4>10.2 Response Plan</h4>
                <ul>
                    <li><strong>Critical Risks:</strong> Immediate notification to Appointing Party and emergency meeting within 24 hours</li>
                    <li><strong>High Risks:</strong> Notification within 1 working day and corrective plan within 3 days</li>
                    <li><strong>Medium Risks:</strong> Document and include in weekly report</li>
                    <li><strong>Low Risks:</strong> Monitor and follow up periodically</li>
                </ul>

                <h4>10.3 Risk Register</h4>
                <p>A live risk register is maintained in the CDE and reviewed monthly with status updates and new risks added as identified.</p>
            `
        };
    }

    function _generateSection11EN() {
        return {
            number: 11,
            title: 'Information Security',
            content: `
                <h4>11.1 Information Security Policy (per ISO 19650-5)</h4>
                <p>Information security requirements are applied in accordance with Part 5 of ISO 19650:</p>

                <h4>11.2 Information Classification</h4>
                <table>
                    <tr><th>Classification</th><th>Description</th><th>Protection Measures</th></tr>
                    <tr><td>Public</td><td>Information available to all project parties</td><td>Basic protection</td></tr>
                    <tr><td>Restricted</td><td>Information available to specific parties only</td><td>Encryption + Access controls</td></tr>
                    <tr><td>Confidential</td><td>Sensitive information requiring high protection</td><td>Encryption + Limited access + Audit</td></tr>
                </table>

                <h4>11.3 Security Measures</h4>
                <ul>
                    <li>Two-factor authentication (2FA) for CDE access</li>
                    <li>Monthly review of access permissions</li>
                    <li>Encryption of all data transferred over the network</li>
                    <li>Logging of all access and modification activities</li>
                    <li>Immediate access revocation when any individual leaves the project</li>
                </ul>

                <h4>11.4 Sensitivity Triage</h4>
                <p>Information-bearing assets are classified by sensitivity level to apply proportionate security controls:</p>
                <table>
                    <tr><th>Level</th><th>Sensitivity Meaning</th><th>Required Controls</th></tr>
                    <tr><td>ST1</td><td>Low sensitivity</td><td>Standard access controls and baseline activity logging</td></tr>
                    <tr><td>ST2</td><td>Moderate sensitivity</td><td>Periodic access review + encryption at rest/in transit</td></tr>
                    <tr><td>ST3</td><td>High sensitivity</td><td>Need-to-know access + detailed audit trails + environment segregation</td></tr>
                    <tr><td>ST4</td><td>Critical sensitivity</td><td>Strict controls, multi-party approvals, and immediate incident response</td></tr>
                </table>
            `
        };
    }

    function _esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return {
        generatePlan(data) {
            return new Promise((resolve) => {
                const sections = [
                    _generateSection1(data),
                    _generateSection2(data),
                    _generateSection3(data),
                    _generateSection4(data),
                    _generateSection5(data),
                    _generateSection6(data),
                    _generateSection7(data),
                    _generateSection8(),
                    _generateSection9(data),
                    _generateSection10(),
                    _generateSection11()
                ];

                resolve({
                    title: `خطة تنفيذ نمذجة معلومات البناء (BEP) - ${data.projectInfo.name}`,
                    subtitle: 'وفقاً لمعيار ISO 19650',
                    date: new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
                    sections
                });
            });
        },

        generatePlanEN(data) {
            return new Promise((resolve) => {
                const sections = [
                    _generateSection1EN(data),
                    _generateSection2EN(data),
                    _generateSection3EN(data),
                    _generateSection4EN(data),
                    _generateSection5EN(data),
                    _generateSection6EN(data),
                    _generateSection7EN(data),
                    _generateSection8EN(),
                    _generateSection9EN(data),
                    _generateSection10EN(),
                    _generateSection11EN()
                ];

                resolve({
                    title: `BIM Execution Plan (BEP) — ${data.projectInfo.name}`,
                    subtitle: 'According to ISO 19650',
                    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                    sections
                });
            });
        },

        getProjectTypeNames() { return projectTypeNames; },
        getScaleNames() { return scaleNames; },
        getDisciplineNames() { return disciplineNames; },
        getBimUseNames() { return bimUseNames; }
    };
})();
