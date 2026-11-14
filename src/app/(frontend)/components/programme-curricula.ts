export type CurriculumSemester = 1 | 2
export type ProgrammeLevel = 100 | 200 | 300 | 400

export type ProgrammeCurriculum = {
  label: string
  major: string
  department: string
  source: 'provided' | 'official'
  courses: Record<ProgrammeLevel, Record<CurriculumSemester, string[]>>
}

function courseList(value: string) {
  return value
    .split('|')
    .map((course) => course.trim())
    .filter(Boolean)
}

function curriculum(
  level100: [string, string],
  level200: [string, string],
  level300: [string, string],
  level400: [string, string],
): ProgrammeCurriculum['courses'] {
  return {
    100: { 1: courseList(level100[0]), 2: courseList(level100[1]) },
    200: { 1: courseList(level200[0]), 2: courseList(level200[1]) },
    300: { 1: courseList(level300[0]), 2: courseList(level300[1]) },
    400: { 1: courseList(level400[0]), 2: courseList(level400[1]) },
  }
}

const business = 'Business Administration & Entrepreneurship'
const communication = 'Communication Arts'
const computational = 'Computational Sciences'
const informatics = 'Informatics'
const biomedical = 'Biomedical Engineering'
const electrical = 'Electrical, Electronics & Computer Engineering'
const mechanical = 'Mechanical, Industrial & Systems Engineering'

export const programmeElectiveGroups = [
  {
    id: 'computer-science-level-400-semester-1',
    major: 'Computer Science',
    level: 400,
    semester: 1,
    choices: [
      {
        code: 'RE2141/CS4129',
        title: 'Artificial Intelligence and Robotics/Introduction to Robotics',
      },
      { code: 'CS/IT4131', title: 'Cloud Application' },
    ],
  },
] as const

export const undergraduateProgrammes: ProgrammeCurriculum[] = [
  {
    label: 'BBA in Accounting',
    major: 'BBA Accounting',
    department: business,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|French Language|FIE Seminar I|Introduction to Programming with Python|Technology and Society|Essential Mathematics for Business (with MATLAB)|Communication and Culture',
        'FIE Seminar II|Logic and Critical Thinking|Text and Meaning|Principles of Management|Financial Accounting I|Principles of Microeconomics',
      ],
      [
        'Database Management Systems|FIE I|Global Environment of Business Decisions|Intellectual Property Law|Leadership Seminar I|Principles of Macroeconomics|Quantitative Methods in Business (with MATLAB)',
        'African Studies|Cost and Management Accounting|Data Analysis for Decision Making|Financial Accounting II|Software Applications in Finance|FIE II',
      ],
      [
        'Business Finance|Entrepreneurial Strategy and Business Models|Financial Reporting I|Leadership Seminar II|Management Accounting|Management and Organisational Behaviour|Monetary and Financial System',
        'Auditing and Assurance|Business Research Methods|Company Law|Financial Reporting II|Industry Internship|Project Management with Risk Analysis for Business|Public Sector Accounting',
      ],
      [
        'Contemporary Issues and Practice in Business|Elective I|Corporate Reporting and Analysis|Principles and Practice of Taxation|Project Work I|The Business Professional',
        'Corporate Finance|Elective II|Financial Risk Management|Forensic Accounting|Project Work II|Sustainable Strategic Management',
      ],
    ),
  },
  {
    label: 'BBA in Banking & Finance',
    major: 'BBA Banking & Finance',
    department: business,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|Essential Mathematics for Business|French Language|FIE Seminar I|Introduction to Doing Business in Africa|Introduction to Programming with Python|Technology and Society',
        'FIE Seminar II|Financial Accounting I|Logic and Critical Thinking|Principles of Management|Principles of Microeconomics|Text and Meaning',
      ],
      [
        'Database Management Systems|FIE I|Global Environment of Business Decisions|Intellectual Property Law|Leadership Seminar I|Principles of Macroeconomics|Quantitative Methods in Business (with MATLAB)',
        'African Studies|Cost and Management Accounting|Data Analysis for Decision Making|Financial Accounting II|Software Applications in Finance|FIE II',
      ],
      [
        'Business Finance|Entrepreneurial Strategy and Business Models|Financial Reporting I|Leadership Seminar II|Management Accounting|Management and Organisational Behaviour|Monetary and Financial System',
        'Financial Reporting II|Business Research Methods|Company Law|Credit Policy and Treasury Management|Industry Internship|Project Management with Risk Analysis for Business|Theory of Investments',
      ],
      [
        'Contemporary Issues and Practice in Business|Elective I|Corporate Reporting and Analysis|Principles and Practice of Taxation|Project Work I|The Business Professional',
        'Corporate Finance|Elective II|Financial Risk Management|Forensic Accounting|Project Work II|Sustainable Strategic Management',
      ],
    ),
  },
  {
    label: 'BBA in Entrepreneurship',
    major: 'BBA Entrepreneurship',
    department: business,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|Essential Mathematics for Business (with MATLAB)|French Language|FIE Seminar I|Introduction to Doing Business in Africa|Introduction to Programming with Python|Technology and Society',
        'FIE Seminar II|Financial Accounting I|Logic and Critical Thinking|Principles of Management|Principles of Microeconomics|Text and Meaning|Market Intelligence|Principles of Human Resource Management',
      ],
      [
        'Financial Statements for Decision-making|Global Environment of Business Decisions|FIE I|Intellectual Property Law|Leadership Seminar I|Principles of Macroeconomics|Quantitative Methods in Business (with MATLAB)|Introduction to Digital Analytics',
        'African Studies|Consumer Preference and Behaviour|Data Analysis for Decision Making|Enterprise Development I|Entrepreneurial Selling|FIE II|International Entrepreneurship',
      ],
      [
        'Business Finance|Entrepreneurial Strategy and Business Models|E-commerce for Entrepreneurs|Leadership Seminar II|Management of Process and Product Innovation|Management and Organisational Behaviour|Growing and Managing New Ventures',
        'Achieving Effective Operations|Business Research Methods|Business Law|Creating Value through Innovation|Enterprise Development II|Project Management with Risk Analysis|Industry Internship',
      ],
      [
        'Contemporary Issues and Practice in Business|Customer Experience Design|Elective I|Enterprise Development III|Principles and Practice of Taxation|The Business Professional',
        'Elective II|Enterprise Development IV|Global Planning and Logistics|Social Entrepreneurship|Sustainable Strategic Management',
      ],
    ),
  },
  {
    label: 'BBA in Human Resource Management',
    major: 'BBA Human Resource Management',
    department: business,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|Essential Mathematics for Business|French Language|FIE Seminar I|Introduction to Doing Business in Africa|Introduction to Programming with Python|Technology and Society',
        'Business, Government and Society|FIE Seminar II|Logic and Critical Thinking|Principles of Human Resource Management|Principles of Management|Principles of Microeconomics|Text and Meaning',
      ],
      [
        'FIE I|Global Environment of Business Decisions|Intellectual Property Law|Leadership Seminar I|Principles of Macroeconomics|Psychology and Work|Quantitative Methods in Business (with MATLAB)',
        'African Studies|FIE II|Human Resource Planning|International Entrepreneurship|Introduction to Public Administration|Labour Economics',
      ],
      [
        'Business Finance|Entrepreneurial Strategy and Business Models|HR Information Systems|Industrial and Employee Relations|Knowledge Management|Leadership Seminar II|Management and Organisational Behaviour',
        'Business Law|Business Research Methods|Industry Internship|Performance and Compensation Management|Project Management with Risk Analysis|Strategic Human Resource Management',
      ],
      [
        'Change Management|Contemporary Issues and Practice in Business|Elective I|Employment Law|Project Work I|The Business Professional',
        'Elective II|International HRM|Project Work II|Public Sector HRM|Sustainable Strategic Management',
      ],
    ),
  },
  {
    label: 'BBA in Marketing',
    major: 'BBA Marketing',
    department: business,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|Essential Mathematics for Business (with MATLAB)|French Language|FIE Seminar I|Introduction to Doing Business in Africa|Introduction to Programming with Python|Technology and Society',
        'FIE Seminar II|Market Intelligence|Logic and Critical Thinking|Principles of Management|Principles of Marketing|Principles of Microeconomics|Text and Meaning',
      ],
      [
        'FIE I|Global Environment of Business Decisions|Intellectual Property Law|Introduction to Digital Analytics|Leadership Seminar I|Principles of Macroeconomics|Quantitative Methods in Business (with MATLAB)',
        'African Studies|Data Analysis for Decision Making|Consumer Preference and Behaviour|Customer Relationship Management|Entrepreneurial Selling|FIE II|International Entrepreneurship',
      ],
      [
        'Brand Management|Business Finance|Digital Marketing Communications Strategy I|Entrepreneurial Strategy and Business Models|Leadership Seminar II|Marketing Information Systems|Management and Organizational Behaviour',
        'Business Law|Business Research Methods|Creating Value through Innovation|Digital Marketing Communications Strategy II|Industry Internship|Marketing Career in Practice|Project Management with Risk Analysis',
      ],
      [
        'Customer Experience Design|Contemporary Issues and Practice in Business|Elective I|Interactive Marketing Management|Project Work I|The Business Professional',
        'Elective II|International Marketing|Project Work II|Sustainable Marketing|Sustainable Strategic Management',
      ],
    ),
  },
  {
    label: 'BA in Advertising & Public Relations',
    major: 'BA Advertising & Public Relations',
    department: communication,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|Communication and Culture|French Language|FIE Seminar I|Introduction to Programming with Python|Essential Mathematics for Business (with MATLAB)|Technology and Society',
        'Principles of Management|FIE Seminar II|Introduction to Advertising|Introduction to Public Relations|Visual Communication|Logic and Critical Thinking|Text and Meaning',
      ],
      [
        'FIE I|Leadership Seminar I|Communication Laws and Ethics|Copywriting for Strategic Communication|Introduction to Photography|Digital Analytics for Advertisers and PR Practitioners|Public Relations and Media Interface',
        'African Studies|FIE II|Case Studies in Strategic Communication|Consumer Preference and Behaviour|Public Speaking Techniques|Theories of Communication',
      ],
      [
        'Leadership Seminar II|Entrepreneurial Strategy and Business Models|Brand Management|Communication Research Methods|Crisis Management|Digital Marketing Communications Strategy I|Media Lab: Advertisement Production',
        'Account and Media Planning|Collaborative Communication|Corporate Social Responsibility|Digital Marketing Communications Strategy II|Industry Internship|Social Media and Online Communities',
      ],
      [
        'Communications Project I|Customer Experience Design|Elective I|Live Event|Multimedia Production',
        'Advanced Writing for Professional Communicators|Communications Project II|Contemporary Issues in Advertising and PR|Documentary Storytelling|Elective II',
      ],
    ),
  },
  {
    label: 'BA in Film and Digital Technologies',
    major: 'BA Film and Digital Technologies',
    department: communication,
    source: 'provided',
    courses: curriculum(
      [
        'Introduction to Film and Digital Media|Visual Storytelling and Composition|Introduction to Programming|Technology and Society|Essential Mathematics|Communication Skills I|French Language I',
        'Digital Photography and Imaging|Introduction to Sound|Digital Editing and Postproduction Tools|Scriptwriting for Screen and Storyboarding|Communication Skills II|Introduction to Philosophy|French Language II',
      ],
      [
        'Film History, Genre and Criticism|Cinematography|Motion Graphics and Animation in 2D|Introduction to Game Design and Gamification|Production Design|African Film Aesthetics and Appreciation|Concepts in African Leadership I|FIE Seminar I',
        'Documentary Filmmaking|Editing and Colour Grading|Film Directing|Production Management|Motion Graphics and Animation in 3D|Portfolio Development and Professional Practice|Concepts in African Leadership II|FIE Seminar II',
      ],
      [
        'Visual Effects and Compositing|AI and Emerging Technologies in Film|Research Methods in Creative Media|Elective I|Elective II|FIE I',
        'Data Visualization and Analytics for Digital Media|Ethics, Law and Intellectual Property in Media|Transmedia Storytelling and Digital Distribution|Elective III|Elective IV|FIE II',
      ],
      [
        'Industry Attachment',
        'Final Year Project|Creative Industry Management and Marketing|Film Entrepreneurship and Monetization',
      ],
    ),
  },
  {
    label: 'BA in Journalism & Mass Communication',
    major: 'BA Journalism & Mass Communication',
    department: communication,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|Communication and Culture|French Language|FIE Seminar I|Introduction to Programming with Python|Essential Mathematics for Business (with MATLAB)|Technology and Society',
        'Principles of Management|FIE Seminar II|Introduction to Economics|Introduction to Journalism and Mass Communication|Visual Communication|Logic and Critical Thinking|Text and Meaning',
      ],
      [
        'FIE I|Leadership Seminar I|Communication Laws and Ethics|Digital Storytelling|Introduction to Photography|History of Media and Journalism in Ghana|Writing for Media',
        'African Studies|FIE II|Newswriting and Reporting|Photojournalism and Narrative|Print Journalism|Public Speaking Techniques|Theories of Communication',
      ],
      [
        'Leadership Seminar II|Entrepreneurial Strategy and Business Models|Broadcast Journalism 1: Radio|Communication Research Methods|Editing|Media Lab: Print and Digital Media',
        'Broadcast Journalism 2: Television|Collaborative Communication|Development Communication|Investigative Journalism|Industry Internship|Special Topics in Journalism and Mass Communication',
      ],
      [
        'Communication and Artificial Intelligence|Elective I|Journalistic Project I|Live Newsroom|Multimedia Production',
        'Advanced Writing for Professional Communicators|Contemporary Issues in Journalism and Mass Communication|Elective II|Journalistic Project II|Social Entrepreneurship',
      ],
    ),
  },
  {
    label: 'BSc in Artificial Intelligence',
    major: 'Artificial Intelligence',
    department: computational,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|French Language|FIE Seminar I|Introduction to Programming with Python|Physical Sciences|Technology and Society|Pre-Calculus (with MATLAB)|Data Analysis using MS Excel',
        'FIE Seminar II|Logic and Critical Thinking|Text and Meaning|Analytic Geometry and Calculus I|Principles of Microeconomics|Programming in C|Financial Accounting I|Introduction to Artificial Intelligence and Robotics',
      ],
      [
        'FIE I|Leadership Seminar I|Fundamentals of Logic Design|AI: Representation and Problem-Solving|Data Structures and Algorithms|Introduction to Computer Systems|Object-Oriented Programming with C++',
        'African Studies|FIE II|Probability, Statistics and Reliability|Applied Linear Algebra|Computer Architecture and Organisation|Design and Analysis of Algorithms|Signals and Systems',
      ],
      [
        'Leadership Seminar II|Applied Probability and Computing|Discrete Mathematics|Digital Signal Processing|Great Theoretical Ideas in Computer Science|Machine Learning|Object-Oriented System Design',
        'Project Management, Engineering Economics and Risk Analysis|Computational Neural Networks|Computer Vision|Industry Internship|Natural Language Processing|Research Methods in Computing',
      ],
      [
        'Autonomous Agents|Computational Perception|Intermediate Data Analytics|Introduction to Deep Learning|Project Phase I|Speech Processing',
        'Professional Ethics and Values|Advanced Data Analytics|Intermediate Deep Learning|Design of Artificial Intelligence Products|Project Phase II',
      ],
    ),
  },
  {
    label: 'BSc in Computer Science',
    major: 'Computer Science',
    department: computational,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|Data Analysis (MS Excel)|French Language|FIE Seminar I|Introduction to Programming with Python|Physical Sciences|Pre-Calculus (with MATLAB)|Technology and Society',
        'Analytic Geometry and Calculus I|Emerging Technologies|Financial Accounting I|FIE Seminar II|Introduction to Electrical and Electronics Engineering|Logic and Critical Thinking|Programming in C|Text and Meaning',
      ],
      [
        'Analytic Geometry and Calculus II|Data Structures and Algorithms|FIE I|Fundamentals of Logic Design|Introduction to Operations Research|Leadership Seminar I|Object-Oriented Programming with C++',
        'African Studies|Applied Linear Algebra|Computer Architecture and Organisation|Design and Analysis of Algorithms|FIE II|Probability, Statistics and Reliability|Programming with Java',
      ],
      [
        'Computer Networks|Database Systems|Discrete Mathematics|Leadership Seminar II|Numerical Methods|Object-Oriented System Design|Operating Systems|Web Technologies',
        'Computer Graphics and Multimedia|Distributed Computing|Industry Internship|Principles of Compiler Design|Project Management, Engineering Economics and Risk Analysis|Research Methods in Computing|Software Engineering',
      ],
      [
        'Computer Security|Computer Systems Programming|Human-Computer Interaction|Project Phase I|Artificial Intelligence and Robotics/Introduction to Robotics|Cloud Application',
        'Introduction to Artificial Intelligence|Mobile Computing|Professional Ethics and Values|Project Phase II|Technical Electives III and IV',
      ],
    ),
  },
  {
    label: 'BSc in Data Science & Artificial Intelligence',
    major: 'Data Science & Artificial Intelligence',
    department: computational,
    source: 'official',
    courses: curriculum(
      [
        'Communication Skills I|French Language I|Introduction to Programming|Technology and Society|Pre-Calculus|Introduction to Data Science|Introduction to Artificial Intelligence|Introduction to Computing & Programming|Principles',
        'Communication Skills II|French Language II|Introduction to Philosophy|Calculus I|Probability & Statistics I|Linear Algebra|Introduction to Economics',
      ],
      [
        'Fundamentals of Innovation and Entrepreneurship (FIE) (Seminar I)|Calculus II|Concept of African Leadership I|Machine Learning Fundamentals|Probability & Statistics II|Data Analytics and Visualisation|Programming for Data Science',
        'Concept of African Leadership II|Fundamentals of Innovation and Entrepreneurship (FIE) (Seminar II)|Applied Regression and Multivariate Analysis|Computer Vision and Image Processing|Data Engineering and Database Systems|Natural Language Processing (NLP)|Discrete Mathematics',
      ],
      [
        'Fundamentals of Innovation and Entrepreneurship (FIE) I|Calculus II|African Leadership I|Machine Learning Fundamentals|Probability & Statistics II|Data Analytics & Visualisation|Programming for Data Science',
        'African Leadership II|Fundamentals of Innovation and Entrepreneurship (FIE) II|Applied Regression & Multivariate Analysis|Computer Vision & Image Processing|Data Engineering & Database Systems|Natural Language Processing|Discrete Mathematics|Cloud Computing',
      ],
      [
        'Professional Ethics & Values|Reinforcement Learning|Elective I|Elective II|Project Phase I',
        'Autonomous Agents|Computer Modelling & Simulation|Elective III|Elective IV|Project Phase II',
      ],
    ),
  },
  {
    label: 'BSc in Information Technology',
    major: 'Information Technology',
    department: informatics,
    source: 'official',
    courses: curriculum(
      [
        'Communication Skills|Data Analysis (using MS Excel)|French Language|Fundamentals of Innovation and Entrepreneurship (FIE) Seminar I|Introduction to Programming with Python|Pre-Calculus (with MATLAB)|Technology and Society',
        'Emerging Technologies|Financial Accounting I|Fundamentals of Innovation and Entrepreneurship (FIE) Seminar II|IT Infrastructure Management|Logic and Critical Thinking|Mathematics for Computing (with MATLAB)|Programming in C|Text and Meaning',
      ],
      [
        'Computer Digital Systems|Data Structures and Algorithms|Database Systems|Fundamentals of Innovation and Entrepreneurship (FIE) I|Global Environment of Business Decisions|Leadership Seminar I|Object Oriented Programming with C++',
        'African Studies|Fundamentals of Innovation and Entrepreneurship (FIE) II|Linux Administration|Operating Systems|Probability, Statistics and Reliability (with MATLAB)|Systems Analysis and Design|Programming with Java',
      ],
      [
        'Computer Networks|Cryptography and Network Security|Introduction to Data Science|Leadership Seminar II|Software Engineering|Storage Management|Web Technologies',
        'Cloud Computing|Computer Graphics and Multimedia|Cybersecurity|Industrial Internship|Multimedia Systems|Project Management, Engineering Economics and Risk Analysis|Research Methods in Computing',
      ],
      [
        'E-commerce|Ethical and Legal Issues in Computing|Human-Computer Interaction|Project Phase I|Technical Elective – I|Technical Elective – II',
        'Mobile Computing|Professional Ethics and Values|Project Phase II|Technical Elective – III|Technical Elective – IV',
      ],
    ),
  },
  {
    label: 'BSc in Biomedical Engineering',
    major: 'Biomedical Engineering',
    department: biomedical,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|French Language|FIE Seminar I|Introduction to Programming with Python|Technology and Society|Physics I: Mechanics|Pre-Calculus (with MATLAB)|Introduction to Biomedical Engineering',
        'FIE Seminar II|Logic and Critical Thinking|Text and Meaning|Introduction to Multidisciplinary Design|Programming in C|Physics II: Electromagnetic Field Theory|Principles of Chemistry I|Analytic Geometry and Calculus I|Introduction to Electrical and Electronics Engineering',
      ],
      [
        'FIE I|Leadership Seminar I|Physics III: Optics|Principles of Chemistry II|Analytic Geometry and Calculus II|Circuit Theory|CAD and CAM|Engineering Thermodynamics',
        'African Studies|FIE II|Applied Linear Algebra|Probability, Statistics and Reliability|Analogue and Digital Electronics|Human Anatomy and Physiology|Introduction to Artificial Intelligence and Robotics|Introduction to Organic Chemistry',
      ],
      [
        'Leadership Seminar II|System Dynamics|Differential Equations|Numerical Methods|Biochemistry|Cell and Molecular Biology|Sensor and Bioinstrumentation I|Signals and Systems',
        'Project Management, Engineering Economics and Risk Analysis|Biomaterials|Biomedical Imaging and Sensing|Digital Signal Processing|Industry Internship|Research Methodology|Sensor and Bioinstrumentation II',
      ],
      [
        'Biomechanics|Biomedical Data Analysis with AI|Medical Devices and Technologies|Project Phase I|Quantitative Physiology|Rehabilitation Engineering',
        'Environmental Science and Engineering|Professional Ethics and Values|Advances in Imaging Technologies: NeuroImaging|Medical Image Processing|Project Phase II|Real-Time Digital Signal Processing',
      ],
    ),
  },
  {
    label: 'BSc in Computer Engineering',
    major: 'Computer Engineering',
    department: electrical,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|French Language|FIE Seminar I|Introduction to Engineering|Introduction to Programming with Python|Physical Sciences|Pre-Calculus (with MATLAB)|Technology and Society',
        'Analytic Geometry and Calculus I|Basic Electronics|FIE Seminar II|Introduction to Multidisciplinary Design|Logic and Critical Thinking|Programming in C|Sensors, Measurements and Instrumentation|Text and Meaning',
      ],
      [
        'Analytic Geometry and Calculus II|Circuit Theory|Computer Systems Engineering|Data Structures and Algorithms|FIE I|Fundamentals of Logic Design|Introduction to Material Science and Engineering|Leadership Seminar I',
        'African Studies|Applied Linear Algebra|Computer Architecture and Organization|Digital Systems Design|FIE II|Microelectronics|Probability, Statistics and Reliability',
      ],
      [
        'Computer Networks|Differential Equations|Discrete Mathematics|Leadership Seminar II|Microprocessors and Microcontrollers|Signals and Systems|Operating Systems|System Dynamics',
        'Automatic Control Systems|Digital Signal Processing|Embedded Systems|Industry Internship|Mechatronics|Software Engineering|Project Management, Engineering Economics and Risk Analysis',
      ],
      [
        'Computer Security|Introduction to Artificial Intelligence|Project Phase I|Technical Electives I and II',
        'Environmental Science and Engineering|Professional Ethics and Values|Project Phase II|Technical Electives III and IV',
      ],
    ),
  },
  {
    label: 'BSc in Electrical & Electronics Engineering',
    major: 'Electrical Engineering',
    department: electrical,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|French Language|FIE Seminar I|Introduction to Engineering|Introduction to Programming with Python|Physical Sciences|Pre-Calculus (with MATLAB)|Technology and Society',
        'Analytic Geometry and Calculus I|FIE Seminar II|Introduction to Electrical and Electronics Engineering|Introduction to Multidisciplinary Design|Logic and Critical Thinking|Programming in C|Sensors, Measurements and Instrumentation|Text and Meaning',
      ],
      [
        'Analytic Geometry and Calculus II|Circuit Theory|Electrical Energy Conversion and Green Electronics|Electromagnetic Fields and Waves Theory|FIE I|Introduction to Material Science and Engineering|Leadership Seminar I',
        'African Studies|Applied Linear Algebra|Electrical Machines|FIE II|Introduction to Contemporary Electric Power Systems|Probability, Statistics and Reliability',
      ],
      [
        'Differential Equations|Leadership Seminar II|Numerical Methods|Power Electronics|Signals and Systems|Systems Dynamics|Microelectronics',
        'Automatic Control Systems|Electric Power Generation, Transmission and Distribution|Microprocessors and Embedded Systems|Industry Internship|Mechatronics|Principles of Communication Systems|Project Management, Engineering Economics and Risk Analysis|Digital Systems Design',
      ],
      [
        'Engineering Thermodynamics|Probabilistic Systems Analysis and Applied Probability|Project Phase I|Technical Electives I and II',
        'Environmental Science and Engineering|Professional Ethics and Values|Project Phase II|Technical Electives III and IV',
      ],
    ),
  },
  {
    label: 'Bachelor of Science in Electric Vehicle Engineering',
    major: 'Electric Vehicle Engineering',
    department: electrical,
    source: 'official',
    courses: curriculum(
      [
        'Introduction to Engineering|Introduction to Programming with Python|Physics I: Mechanics|Calculus I|Engineering Lab I: Circuits|Technology and Society|Communication Skills I|Communication Skills II|Introduction to Philosophy|French Language I',
        'Physics II: Electricity and Magnetism|Programming in C|Calculus II|Circuit I|French Language II',
      ],
      [
        'Introduction to Materials Science and Engineering|Chemistry for Engineers|Linear Algebra|Circuit II|Computer-Aided Design and Manufacture|Engineering Thermodynamics|Concepts in African Leadership I|FIE Seminar I',
        'Digital Systems and Logic Design|Probability and Statistics|Sensors and Instrumentation|Engineering Lab II: Digital Systems Design, Sensors and Instrumentation and Electromagnetics Wave|Fluid Mechanics|Hybrid Electric Vehicles|Concepts in African Leadership II|FIE Seminar II',
      ],
      [
        'System Dynamics|Signals and Systems|Waves and Optics|Microprocessors and Microcontrollers Programming|Battery Technology and Energy Storage Systems|Differential Equations and Numerical Methods|Engineering Lab III: Engineering Design: Project I|Engineering Lab IV: Engineering Design: Project II|Fundamentals of Innovation and Entrepreneurship I',
        'Embedded Systems|Automatic Control Systems|Mechatronics Systems Design|Research Methods|Electric Vehicle Powertrain Systems|Project Management, Engineering Economics and Risk Analysis|Industry Internship',
      ],
      [
        'Power Electronics|Vehicle Dynamics and Control|Embedded Systems for Renewable Energy|Electric Vehicle Charging Infrastructure|Energy Storage in eMobility|Automotive Chassis Systems|Project Phase I',
        'Professional Ethics and Values|Environmental Science and Engineering|Advanced EV Design|Battery Thermal Management|Automotive HVAC Systems|Autonomous and Connected Vehicles|Project Phase II',
      ],
    ),
  },
  {
    label: 'BSc in Electronics & Communication Engineering',
    major: 'Electronics & Communication Engineering',
    department: electrical,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|French Language|FIE Seminar I|Introduction to Engineering|Introduction to Programming with Python|Physical Sciences|Pre-Calculus (with MATLAB)|Technology and Society',
        'Analytic Geometry and Calculus I|Basic Electronics|FIE Seminar II|Introduction to Multidisciplinary Design|Logic and Critical Thinking|Programming in C|Sensors, Measurements and Instrumentation|Text and Meaning',
      ],
      [
        'Analog Communication|Analytic Geometry and Calculus II|Circuit Theory|Electromagnetic Fields and Waves Theory|FIE I|Introduction to Material Science and Engineering|Leadership Seminar I',
        'African Studies|Applied Linear Algebra|Data Communication and Computer Networks|Electrical Machines|FIE II|Probability, Statistics and Reliability|Solid State Electronic Devices',
      ],
      [
        'Differential Equations|Digital Communication|Digital Systems Design|Leadership Seminar II|Numerical Methods|Signals and Systems|Systems Dynamics',
        'Antennas and Wave Propagation|Automatic Control Systems|Digital Signal Processing|Microprocessors and Microcontrollers|Project Management, Engineering Economics and Risk Analysis|Telecommunications Switching and Networks|Industry Internship',
      ],
      [
        'Advanced Digital Signal Processing|Microwave Engineering|Mobile Communication|Optical Communication|Project Phase I|Remote Sensing',
        'Environmental Science and Engineering|Professional Ethics and Values|Project Phase II|Real-Time Digital Signal Processing|Satellite Communication|Telecommunication System Modelling and Simulation',
      ],
    ),
  },
  {
    label: 'BSc in Unmanned Aerial Systems (UAS) Engineering',
    major: 'Unmanned Aerial Systems Engineering',
    department: electrical,
    source: 'official',
    courses: curriculum(
      [
        'Communication Skills I|French Language I|Physics I (Mechanics)|Introduction to Programming|Technology and Society|Introduction to Engineering|Calculus I',
        'Communication Skills II|French Language II|Introduction to Philosophy|Calculus II|Physics II (Electricity & Magnetism)|Programming in C|Circuit I|Engineering Lab I (Circuits)',
      ],
      [
        'FIE Seminar I|Concepts in African Leadership I|Introduction to Material Science and Engineering|Linear Algebra|Circuit II|Introduction to UAS Fundamentals and System Integration|Computer-Aided Design and Manufacturing (CAD/CAM)|Engineering Thermodynamics',
        'Concepts in African Leadership II|FIE Seminar II|Probability & Statistics|Digital Systems and Logic Design|Sensors and Instrumentation|Waves and Optics|Fluid Mechanics|Engineering Lab II (Digital Systems, Sensors & EM Applications)',
      ],
      [
        'Fundamentals of Innovation & Entrepreneurship I|System Dynamics|Flight Dynamics and Control|Signals and Systems|Microelectronics|Microprocessors/Microcontrollers Programming|AI for UAVs|Engineering Lab III (Engineering Design Project I)',
        'Fundamentals of Innovation & Entrepreneurship II|Automatic Control Systems|Propulsion & Payload Integration of UAS|Project Management, Engineering Economics & Risk Analysis|Embedded Systems|Mechatronics System Design|Industry Internship|Research Method|Engineering Lab IV (Engineering Design Project II)',
      ],
      [
        'UAS Regulation and Airspace Management|Project Phase I|Technical Elective I|Technical Elective II|Robotics & Autonomous Systems|Power Electronics',
        'Professional Ethics and Values|UAS Maintenance, Safety and Environmental Impact|Environmental Science and Engineering|Project Phase II (Implementation & Defence)|Technical Elective III',
      ],
    ),
  },
  {
    label: 'BSc in Industrial & Systems Engineering',
    major: 'Industrial & Systems Engineering',
    department: mechanical,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|French Language|FIE Seminar I|Introduction to Engineering|Introduction to Programming with Python|Physical Sciences|Pre-Calculus (with MATLAB)|Technology and Society',
        'Analytic Geometry and Calculus I|Engineering Mechanics|FIE Seminar II|Introduction to Industrial and Systems Engineering|Introduction to Multidisciplinary Design|Logic and Critical Thinking|Sensors, Measurements and Instrumentation|Text and Meaning',
      ],
      [
        'Analytic Geometry and Calculus II|CAD and CAM|Computing in Industrial and Systems Engineering|Electricity and Optics|FIE I|Introduction to Material Science and Engineering|Leadership Seminar I',
        'African Studies|Applied Linear Algebra|Data Management for Industrial and Systems Engineers|FIE II|Manufacturing Processes I|Probability, Statistics and Reliability',
      ],
      [
        'Design of Experiments|Deterministic Operations Research (Optimisation)|Differential Equations|Production Planning and Inventory Control|Leadership Seminar II|Manufacturing Processes II|Mechanics of Materials',
        'Discrete-Event Computer Simulation|Human Factors and Ergonomics|Industrial Ergonomics and Work Measurements|Industry Internship|Probabilistic Operations Research (Stochastic Models)|Project Management, Engineering Economics and Risk Analysis|Statistical Quality Control',
      ],
      [
        'Industrial Automation and Robotics|Lean Manufacturing|Logistics Engineering|Project Phase I|Technical Electives I and II',
        'Environmental Science and Engineering|Occupational Safety and Hazard Control|Professional Ethics and Values|Project Phase II|Technical Electives III and IV',
      ],
    ),
  },
  {
    label: 'BSc in Mechanical Engineering',
    major: 'Mechanical Engineering',
    department: mechanical,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|French Language|FIE Seminar I|Introduction to Engineering|Introduction to Programming with Python|Physical Sciences|Pre-Calculus (with MATLAB)|Technology and Society',
        'Analytic Geometry and Calculus I|Engineering Mechanics|FIE Seminar II|Introduction to Multidisciplinary Design|Logic and Critical Thinking|Programming in C|Sensors, Measurements and Instrumentation|Text and Meaning',
      ],
      [
        'Analytic Geometry and Calculus II|CAD and CAM|Electronics and Microprocessors|Engineering Thermodynamics|FIE I|Introduction to Material Science and Engineering|Leadership Seminar I',
        'African Studies|Applied Linear Algebra|Fluid Mechanics|FIE II|Manufacturing Processes I|Mechanics of Machines I|Probability, Statistics and Reliability',
      ],
      [
        'Differential Equations|Leadership Seminar II|Machine Design|Manufacturing Processes II|Mechanics of Machines II|Mechanics of Materials|Numerical Methods|Systems Dynamics',
        'Applied Hydraulics and Pneumatics|Automatic Control System|Gas Dynamics and Jet Propulsion|Industry Internship|Internal Combustion Engines and Steam Turbine|Mechatronics|Project Management, Engineering Economics and Risk Analysis',
      ],
      [
        'Industrial Automation and Robotics|Project Phase I|Quality Control and Reliability Engineering|Thermal Engineering|Technical Electives I and II',
        'Environmental Science and Engineering|Maintenance Engineering|Professional Ethics and Values|Project Phase II|Technical Electives III and IV',
      ],
    ),
  },
  {
    label: 'BSc in Nuclear Engineering',
    major: 'Nuclear Engineering',
    department: mechanical,
    source: 'official',
    courses: curriculum(
      [
        'Technology and Society|Introduction to Nuclear Engineering|Physics I (Mechanics)|Calculus I|Communication Skills I|Introduction to Programming|French Language I',
        'Programming in C|Chemistry for Engineers|Engineering Mechanics: Statistics and Dynamics|Calculus II|Physics II (Electricity & Magnetism)|Communication Skills II|Introduction to Philosophy|French Language II',
      ],
      [
        'Nuclear Chemistry|Electronics & Microprocessors|Engineering Thermodynamics|Introduction to Material Science & Engineering|Radiation & Its Effect on Matter|Linear Algebra|Fundamentals of Innovation and Entrepreneurship (FIE) Seminar I|African Leadership I',
        'Fluid Mechanics|Heat Transfer|Radiation Protection & Dosimetry|Probability & Statistics|Differential Equations|Fundamentals of Innovation and Entrepreneurship (FIE) Seminar I|African Leadership II',
      ],
      [
        'Reactor Physics|Nuclear Reactor Design|Nuclear Fuel Cycle|Nuclear Safety & Risk Analysis|Numerical Analysis|FIE I Fundamentals of Innovation and Entrepreneurship I',
        'Thermal Hydraulics of Nuclear Reactor|Nuclear Reactor Dynamics & Stability|Project Management & Engineering Economics|Mechanics of Materials|Research Methods|Fundamentals of Innovation and Entrepreneurship II',
      ],
      [
        'Control Systems for Nuclear Reactor|Materials for Nuclear Systems|Nuclear Instrumentation and Measurement Lab|Reactor Physics Calculations and Simulation|Corrosion for Engineers|Radiation Shielding and Design|Dosimetric and Radiometric Devices and Methods|Fusion Power Engineering|Capstone Design I|Capstone Design II',
        'Nuclear Power Systems|Professional Ethics & Values|Environmental Science & Engineering|Nuclear Plant Design & Simulation|Nuclear Plant Safety Design|Nuclear Security & Safeguards System|Nuclear Disaster Management|Nuclear Power Plant Operation|Radioactive Waste Management Design',
      ],
    ),
  },
  {
    label: 'BSc in Robotics Engineering',
    major: 'Robotics Engineering',
    department: mechanical,
    source: 'provided',
    courses: curriculum(
      [
        'Communication Skills|French Language|FIE Seminar I|Introduction to Engineering|Introduction to Programming with Python|Physical Sciences|Technology and Society|Pre-Calculus (with MATLAB)',
        'FIE Seminar II|Logic and Critical Thinking|Text and Meaning|Introduction to Multidisciplinary Design|Programming in C|Sensors, Measurements and Instrumentation|Analytic Geometry and Calculus I|Introduction to Electrical and Electronics Engineering|Engineering Mechanics',
      ],
      [
        'FIE I|Leadership Seminar I|Introduction to Material Science and Engineering|Analytic Geometry and Calculus II|Artificial Intelligence and Robotics|Circuit Theory|CAD/CAM|Mechanics of Materials',
        'African Studies|FIE II|Applied Linear Algebra|Probability, Statistics and Reliability|Analogue, Digital Electronics and Linear Integrated Circuits|Fluid Mechanics|Unified Robotics I: Actuation',
      ],
      [
        'Leadership Seminar II|System Dynamics|Differential Equations and Numerical Methods|Machine Design|Microprocessors and Microcontrollers|Signals and Systems|Unified Robotics II: Sensing|Wireless Sensor Networks',
        'Project Management, Engineering Economics and Risk Analysis|Automatic Control Systems|Digital Signal Processing|Embedded Systems|Machine Learning|Machines and Drives|Unified Robotics III: Manipulation',
      ],
      [
        'Advanced Instrumentation|Autonomous Agents|Computer Vision|Industrial Robotics|Project Phase I|Unified Robotics IV: Navigation',
        'Environmental Science and Engineering|Professional Ethics and Values|Modelling and Analysis of Mechatronic Systems|Project Phase II|Industry Internship',
      ],
    ),
  },
]

export const curriculumSources = {
  officialProgrammeList: 'https://acity.edu.gh/undergraduate-programmes/',
  officialCourseOutlines: [
    'https://acity.edu.gh/undergraduate/bsc-data-science-artificial-intelligence/',
    'https://acity.edu.gh/undergraduate/bsc-information-technology/',
    'https://acity.edu.gh/undergraduate/bachelor-of-science-in-electric-vehicle-engineering/',
    'https://acity.edu.gh/undergraduate/bsc-unmanned-aerial-systems-uas-engineering/',
    'https://acity.edu.gh/undergraduate/bsc-nuclear-engineering/',
  ],
} as const
