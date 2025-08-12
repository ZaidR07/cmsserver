export const secretkey = "gshgdhvb@@$3242dnvdnvdn11111"

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Lobster+Two:ital,wght@0,400;0,700;1,400;1,700&family=Playwrite+AU+QLD:wght@100..400&display=swap" rel="stylesheet">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate</title>
    <style>
        /* Ensure PDF has no printer margins and exact size */
        @page {
            size: 750px 1000px;
            margin: 0;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html {
            width: 750px;
            height: 1000px;
            background: white;
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Times New Roman', serif;
            background: white;
            color: #000;
            width: 750px;
            height: 1000px;
        }

        .certificate-wrapper {
            position: relative;
            width: 100%;
            height: 100%;
            margin: 0;
            background: white;
            border: 3px solid #000;
            overflow: hidden; /* avoid scrollbars in PDF */
        }

        .decorative-corner {
            position: absolute;
            width: 30px;
            height: 30px;
            border: 2px solid #000;
        }
        /* Side rails with gradient background */
        .side-rail {
            position: absolute;
            top: 0;
            height: 1000px; /* explicit height to match certificate */
            width: 36px;
            flex-direction: column;
            gap: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
        }
        .side-rail.left { left: 0; }
        .side-rail.right { right: 0; }
        .rail-text {
            writing-mode: vertical-rl;
            font-size: 18px;
            color: #1e3a5f; /* slightly darker */
            font-weight: bold;
            letter-spacing: 1px;
            font-family: 'Lobster Two', cursive;
        }
        /* Side-specific rotation: make text bottoms point inward */
        .side-rail.left .rail-text { transform: rotate(180deg); }
        .side-rail.right .rail-text { transform: none; }

        /* Left rail: teal-ish sweep */
        .side-rail.left {
            background: linear-gradient(0deg,rgb(188, 222, 248),rgb(161, 200, 239) , rgb(109, 176, 242));
        }

        /* Right rail: steel-blue sweep */
        .side-rail.right {
            background: linear-gradient(0deg,rgb(90, 109, 193),rgb(151, 164, 222) , rgb(188, 222, 248));
        }
        
        .corner-top-left {
            top: 20px;
            left: 20px;
            border-right: none;
            border-bottom: none;
        }
        
        .corner-top-right {
            top: 20px;
            right: 20px;
            border-left: none;
            border-bottom: none;
        }
        
        .corner-bottom-left {
            bottom: 20px;
            left: 20px;
            border-right: none;
            border-top: none;
        }
        
        .corner-bottom-right {
            bottom: 20px;
            right: 20px;
            border-left: none;
            border-top: none;
        }

        .certificate-main {
            position: relative;
            width: 100%;
            height: 100%;
            padding: 24px;
            box-sizing: border-box;
        }

        .certificate-inner {
            position: relative;
            width: 100%;
            height: 100%;
            border: 2px solid #000;
            padding: 8px 35px;
            box-sizing: border-box;
            background: white;
        }

        .certificate-content {
            position: relative;
            z-index: 3; /* above watermark and mask */
            background: transparent;
            padding: 15px; /* keep content away from borders */
        }

        /* Mask to hide watermark in bottom signatures/gradation area */
        .watermark-mask-bottom {
            position: absolute;
            left: 36px; /* inside rails */
            right: 36px;
            bottom: 0;
            height: 180px; /* covers signatures and gradation bar */
            background: #ffffff;
            z-index: 2; /* above watermark (z=1), below content (z=3) */
        }

        .header {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 8px;
            min-height: 120px;
            position: relative; /* to position associates strip */
        }

        .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .main-logo {
            text-align: center;
            width: 280px;
            height: auto;
            max-height: 260px;
            display: block;
        }

        /* Associates image at top-right */
        .associates-top-right {
            position: absolute;
            top: 2px; /* increased to avoid overlap */
            right: -35px; /* increased to avoid overlap */
            width: 130px;
            height: auto;
            z-index: 4; /* ensure visible above nearby elements */
        }
        

        /* Top and bottom rails */
        .top-rail, .bottom-rail {
            position: absolute;
            left: 36px; /* after left rail (match side-rail width) */
            right: 36px; /* before right rail (match side-rail width) */
            height: 42px;
            background: none; /* gradient set per rail */
            /* removed borders */
            display: flex;
            align-items: center;
            overflow: hidden;
            z-index: 2;
        }

        /* Distinct L→R gradients */
        .top-rail {
            background: linear-gradient(90deg,rgb(109, 176, 242),rgb(161, 200, 239),rgb(188, 222, 248));
        }
        .bottom-rail {
            background: linear-gradient(90deg,rgb(188, 222, 248),rgb(151, 164, 222),rgb(90, 109, 193));
        }
           
        .top-rail { top: 0; }
        .bottom-rail { bottom: 0; }
        .rail-repeat {
            white-space: nowrap;
            width: 100%;
            text-align: center;
            color: #1e3a5f; /* slightly darker to match side rails */
            font-weight: bold;
            letter-spacing: 1px;
            font-size: 20px;
            opacity: 0.9;
            font-family: 'Lobster Two', cursive;
        }

        /* Bottom rail smaller text */
        .bottom-rail .rail-repeat {
            font-size: 14px;
            text-align: center;
            font-family: 'Times New Roman', serif;
            font-weight: 600; /* semi-bold */
        }

        .title {
            text-align: center;
            font-size: 40px;
            color: #2c5f7a;
            font-weight: normal;
            font-style: italic;
            margin: 6px 0 4px 0;
            word-spacing: 2px;
            font-family: 'Lobster Two', cursive;
        }
        .title-sep {
            border: none;
            border-top: 2px dotted #c1c1c1;
            margin: 6px 40px 10px 40px;
        }

        /* Apply same styling as exam-intro to the 'has successfully completed course in' line */
        .course-info p strong {
            font-family: 'Lobster Two', cursive;
            font-style: italic;
            font-size: 22px; /* match exam-intro */
            letter-spacing: 0.5px; /* match exam-intro */
            word-spacing: 2px; /* match exam-intro */
        }

        /* Center alignment and spacing for completion line and course name */
        .course-info {
            text-align: center;
        }
        .course-info p {
            text-align: center;
            margin: 6px 0 8px 0; /* small gap above course name */
        }
        .course-line {
            display: flex;
            justify-content: center; /* center the underline block */
            margin-top: 2px;
        }
        .course-name {
            display: inline-block;
            font-weight: bold;
            font-size: 24px;
            border-bottom: 2px solid #000; /* underline */
            padding: 0 14px 2px; /* breathing room around text */
        }

        /* Strong visual table for DESCRIPTION like the sample */
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 37px 0 18px 0;
            border: 1px solid #000;
        }
        .details-table th, .details-table td {
            padding: 4px 2px; /* increase top/bottom by 2px */
            font-size: 16px;
        }
        /* Keep headers centered; set normal weight */
        .details-table th { text-align: center; font-weight: normal; }
        /* Left align body cells with extra left padding */
        .details-table td { text-align: left; padding-left: 15px; }
        /* Keep all borders for headers */
        .details-table th { border: 1px solid #000; }
        /* Remove top/bottom borders for rows, keep left/right */
        .details-table td { border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: none; }
        .details-table th {
            font-weight: normal;
            font-size: 18px;
        }
        .details-table tr:last-child th { font-size: 20px; }

        .student-line { text-align: center; margin: 2px 0 2px 0; }
        .student-name { font-size: 28px; font-weight: bold; color: #1f2937; }

        .certicateno{
            text-align: right;
            font-size: 16px;
            color: #2c5f7a;
            font-weight: bold;
            margin-bottom:8px;
        }

        .content {
            margin-bottom: 8px;
            line-height: 1.8;
            font-size: 18px;
        }

        /* Layout below the DESCRIPTION table */
        .exam-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 8px 0;
        }
        .exam-info .branch-info,
        .exam-info .performance-info {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .info-line {
            display: inline-block;
            min-width: 180px;
            border-bottom: 2px dotted #666;
            height: 24px;
            line-height: 24px;
            padding: 0 6px;
        }
        /* The cursive intro line just after the table */
        .exam-intro strong {
            font-family: 'Lobster Two', cursive;
            font-style: italic;
            font-size: 22px; /* increased size */
            letter-spacing: 0.5px; /* increased letter spacing */
            word-spacing: 2px; /* increased word spacing */
        }
        /* Make the dotted line fill the rest of the row in exam-intro */
        .exam-intro .branch-info { width: 100%; }
        .exam-intro .info-line {
            display: block;
            flex: 1 1 auto;
            min-width: 0 !important; /* override any inline min-width */
        }

        .field-value {
            color: #6b46c1;
            font-weight: bold;
            font-style: italic;
            font-size: 20px;
            margin-left: 25px;
        }

        .line {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 2px;
        }

        .dotted-line {
            border-bottom: 2px dotted #666;
            flex: 1;
            height: 24px;
            line-height: 24px;
            display: flex;
            align-items: center;
            padding-left: 5px;
        }

        .bottom-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 30px;
            position: relative;
        }

        .signatures {
            text-align: center;
            flex: 1;
            margin: 0 10px;
        }

        .signature-line {
            border-bottom: 3px solid #000; /* thicker for visibility */
            margin: 12px 50px 8px 50px; /* tighten spacing between image and text */
            height: 1px;
            position: relative;
            z-index: 3; /* above images */
        }

        .signature-text {
            font-size: 14px;
            margin-top: 10px;
        }

        .student-photo {
            width: 80px;
            height: 100px;
            border: 2px solid #2c5f7a;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #666;
        }

        .contact-info {
            text-align: center;
            font-size: 18px;
            margin-top: 15px;
            font-weight: bold;
        }

        .email-link {
            color: #2563eb;
            text-decoration: none;
        }

        .associates-logo {
            height: 50px;
            margin-bottom: -5px;
        }

        /* Center image in signatures section */
        .center-image {
            display: flex;
            justify-content: center;
            align-items: center;
            flex: 1;
        }
        
        .signature-center-image {
            width: 100px;
            height: 100px;
            object-fit: contain;
            margin-bottom: -10px;
            position: relative;
            z-index: 1; /* below line */
        }

        .signature-image {
            width: 140px;
            height: 70px;
            object-fit: contain;
            margin-bottom: -10px;
            position: relative;
            z-index: 1; /* below line */
            display: block;
        }

        /* Signatures section horizontal layout */
        .signatures-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 30px;
        }

        .signature-left, .signature-right {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            flex: 1;
            position: relative; /* ensure proper stacking context for z-index */
        }

        /* Exam info spacing */
        .exam-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 4px;
        }
        .exam-intro {
            margin-top: 6px;
            margin-bottom: 8px; /* small extra gap before Branch/Performance */
        }
    </style>
</head>
<body>
    <div class="certificate-wrapper">
        <div class="decorative-corner corner-top-left"></div>
        <div class="decorative-corner corner-top-right"></div>
        <div class="decorative-corner corner-bottom-left"></div>
        <div class="decorative-corner corner-bottom-right"></div>
        <div class="side-rail left">
            <div class="rail-text">TalkTech Institute</div>
            <div class="rail-text">TalkTech Institute</div>
            <div class="rail-text">TalkTech Institute</div>
            <div class="rail-text">TalkTech Institute</div>
            <div class="rail-text">TalkTech Institute</div>
            <div class="rail-text">TalkTech Institute</div>
        </div>
        <div class="side-rail right">
            <div class="rail-text">TalkTech Institute</div>
            <div class="rail-text">TalkTech Institute</div>
            <div class="rail-text">TalkTech Institute</div>
            <div class="rail-text">TalkTech Institute</div>
            <div class="rail-text">TalkTech Institute</div>
            <div class="rail-text">TalkTech Institute</div>
        </div>
        <div class="top-rail"><div class="rail-repeat">TalkTech Institute &nbsp; TalkTech Institute &nbsp; TalkTech Institute &nbsp; TalkTech Institute</div></div>
        <div class="bottom-rail"><div class="rail-repeat">GRADATION: 90% Above A++, 75% to 89% A+, 60% to 74% A, 50% to 59% B</div></div>
        
        <div class="certificate-main">
            <div class="certificate-inner">
                
                
        <div class="certificate-content">
            <div class="header">
                <img src="${certificateData.logo}" alt="Institute Logo" class="main-logo">
                <img src="https://trexcms.s3.ap-south-1.amazonaws.com/aicidb/AICI%20COMPUTER%20INSTITUTE/1752208929037_logo.png" class="associates-top-right">
            </div>
            
            <div class="title">This is to certify that</div>
            
            <div class="student-line">
                <div class="student-name">${certificateData.studentName}</div>
            </div>
            <hr class="title-sep" />
            
            <div class="course-info">
                <p><strong>has successfully completed course in</strong></p>
                <div class="course-line">
                    <div class="course-name">${certificateData.courseName}</div>
                </div>
            </div>
            
            <table class="details-table">
                <tr>
                    <th>DESCRIPTION</th>
                    <th>%</th>
                    <th>Remark</th>
                </tr>
                ${certificateData.descriptionsRows}
                <tr>
                    <th>Total</th>
                    <th></th>
                    <th></th>
                </tr>
            </table>
            
            <div class="exam-info exam-intro">
                <div class="branch-info" style="gap:6px;">
                    <span><strong>and passed the exam held in the month of</strong></span>
                    <span class="info-line" style="min-width:140px;">${certificateData.examMonth}</span>
                </div>
            </div>
            
            <div class="exam-info">
                <div class="branch-info">
                    <span><strong>Branch:</strong></span>
                    <span class="info-line">Nallasopara</span>
                </div>
                <div class="performance-info">
                    <span><strong>Performance:</strong></span>
                    <span class="info-line">${certificateData.performance}</span>
                </div>
            </div>
            
            <div class="exam-info">
                <div class="branch-info">
                    <span><strong>Place:</strong></span>
                    <span class="info-line">Palghar</span>
                </div>
                <div class="performance-info">
                    <span><strong>Grade:</strong></span>
                    <span class="info-line">${certificateData.grade}</span>
                </div>
            </div>
            
            <div class="signatures-section">
                <div class="signature-left">
                    <img src="https://trexcms.s3.ap-south-1.amazonaws.com/talktechdb/TALKTECH INSTITUTE/1754486720062_signature.png" alt="Signature" class="signature-image">
                    <div class="signature-line"></div>
                    <div><strong>Authorised signature</strong></div>
                </div>
                
                <div class="center-image">
                    <img src="https://trexcms.s3.ap-south-1.amazonaws.com/talktechdb/TALKTECH INSTITUTE/1754986244261_logo.png" alt="Center Stamp" class="signature-center-image">
                </div>
                
                <div class="signature-right">
                    <img src="https://trexcms.s3.ap-south-1.amazonaws.com/talktechdb/TALKTECH INSTITUTE/1754986107640_logo.png" alt="Logo" class="signature-image">
                    <div class="signature-line"></div>
                    <div><strong>Authorised signature</strong></div>
                </div>
            </div>
            
            
        </div>
                </div>
            </div>
        </div>
    </div>
</body>
 </html>`;
export { htmlTemplate };
