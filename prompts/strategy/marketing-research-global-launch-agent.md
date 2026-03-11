<!-- AGENT-DOC-PROTOCOL:START -->
> Agent note: Follow `docs/development/DOCUMENTATION_PROTOCOL.md`. Keep canonical docs aligned to current truth, verify platform claims against code before concluding system state, log material documentation-policy changes in `docs/development/BUILD_LOG.md`, and align or clearly mark supporting docs when assumptions change.
<!-- AGENT-DOC-PROTOCOL:END --># Koydo — Master AI Agent Research Prompt

> **Purpose**: Feed this entire document to an AI research agent (Claude, GPT, Gemini, Perplexity, or similar with web-search capability) to conduct exhaustive marketing research for Koydo's global launch.  
> **How to use**: Copy-paste relevant sections as prompts, or feed the entire document as context for a multi-turn research session. Each section is self-contained and can be used independently.  
> **Last updated**: March 2026

---

## PRODUCT CONTEXT (Include This With Every Prompt)

```
PRODUCT: Koydo — Children's Educational Platform
TYPE: Web app (Next.js) → Google Play → iOS  
AUDIENCE: Children ages 3–18+ (6 education stages), parents, teachers, homeschool families
PRICING: Freemium — Core Practice $0, Learning Plus $7.99/mo, Family $19.99/mo, 
         Household All-Access $29.99/mo, Cinematic+ $9.99/mo addon, 
         School $4.99/seat/mo annual, K-12 Classroom free 7AM-3PM
LANGUAGES: English & Spanish at launch, more planned
LAUNCH: March 13, 2026
KEY FEATURES: AI companions (Aria & Kai), TTS narration, interactive games, 
              audiobooks, spaced repetition, multilingual, offline progress
TARGET MARKETS: United States, Canada, United Kingdom, Australia, Mexico, 
                Spain, Colombia, Argentina, India, Philippines, South Africa,
                Nigeria, Brazil (future), Germany (future), France (future),
                Japan (future), South Korea (future)
COMPETITORS: Khan Academy Kids, ABCmouse, Homer, Epic!, Duolingo ABC, 
             IXL, Prodigy, BrainPOP, Outschool, Age of Learning
```

---

# PART 1: INFLUENCER RESEARCH PROMPTS

## 1.1 — Top 1000 Influencers: Parenting & Motherhood

```
TASK: Research and compile a detailed list of the top parenting and motherhood 
influencers worldwide who would be relevant for promoting a children's educational 
app (ages 3-18+). 

For EACH influencer provide:
- Full name / username
- Platform(s) (TikTok, Instagram, YouTube, Blog, Pinterest)
- Handle/URL for each platform
- Follower count (approximate)
- Country / primary audience geography
- Content niche (e.g., "homeschool mom", "gentle parenting", "mommy vlogger")
- Engagement rate (if available)
- Contact method: email (from bio/website), management agency, DM preferred
- Estimated sponsored post rate (if publicly known)
- Languages they create content in
- Whether they've promoted educational apps before (yes/no/unknown)
- Audience age demographic (if known)

ORGANIZE BY TIER:
- Mega (1M+ followers): Top 50
- Macro (500K-1M): Top 100
- Mid-Tier (100K-500K): Top 200
- Micro (10K-100K): Top 400
- Nano (1K-10K): Top 250

ORGANIZE BY COUNTRY:
- United States: 300 influencers
- United Kingdom: 100 influencers
- Canada: 80 influencers
- Australia: 60 influencers
- Mexico: 80 influencers (Spanish-language)
- Spain: 60 influencers (Spanish-language)
- Colombia: 40 influencers (Spanish-language)
- Argentina: 30 influencers (Spanish-language)
- India: 80 influencers (English-language Indian parenting)
- Philippines: 40 influencers (English-language)
- South Africa: 30 influencers (English-language)
- Nigeria: 30 influencers (English-language)
- Other countries: 70 influencers

SEARCH USING these hashtags and keywords:
#MomTok #DadTok #MomBlogger #ParentingBlogger #MomInfluencer #DadInfluencer
#ParentingTips #MomLife #MumLife #NewMom #FirstTimeMom #WorkingMom #SAHMlife
#ParentingHacks #MomHacks #DadHacks #FamilyVlog #MomVlog #ParentReviews
#ProductReview #KidsProducts #FamilyLife #RaisingKids #MomCommunity
#ParentingGoals #ModernParenting #GentleParenting #PositiveParenting
#AttachmentParenting #MindfulParenting #CrunchyMom #SilkyMom
#MamáBlogger #MamáInfluencer #CrianzaPositiva #VidaDeMamá
#MumBlogger #UKMum #AussieMum #IndianMom #AfricanMom

OUTPUT FORMAT: CSV or structured table with all fields above.
```

## 1.2 — Top 1000 Influencers: Education & Homeschool

```
TASK: Research and compile a detailed list of the top education, homeschool, 
and teacher influencers worldwide who would be relevant for promoting a 
children's educational app/platform.

For EACH influencer provide the same fields as prompt 1.1.

CATEGORIES TO COVER:

A) HOMESCHOOL INFLUENCERS (300 total)
Search hashtags: #HomeschoolMom #Homeschooling #HomeschoolLife #HomeschoolDay
#HomeschoolCurriculum #HomeschoolTips #HomeschoolCommunity #SecularHomeschool
#ChristianHomeschool #ClassicalHomeschool #CharlotteMason #Unschooling
#HomeschoolHaul #CurriculumReview #HomeschoolPrep #HomeschoolIdeas
#WaldorfHomeschool #MontessoriHomeschool #EclecticHomeschool
#EducaciónEnCasa #HomeschoolMéxico #EducaciónAlternativa
- US: 150, UK: 30, Canada: 30, Australia: 20, Mexico/LATAM: 40, Other: 30

B) TEACHER INFLUENCERS / "TEACHERGRAMMERS" (300 total)
Search hashtags: #TeachersOfInstagram #TeacherLife #TeacherTok #ElementaryTeacher
#MiddleSchoolTeacher #HighSchoolTeacher #TeachersOfTikTok #TeacherHacks
#ClassroomDecor #TeacherTips #EdChat #EduTok #TeachingResources
#STEMTeacher #MathTeacher #ScienceTeacher #ReadingTeacher #SpecialEducation
#TeacherCreator #TPTSeller #TeachersPayTeachers #iteach #iteachkinder
#iteachfirst #iteachsecond #iteachthird #iteachfourth #iteachfifth
#ProfesorCreativo #MaestrosDeInstagram #DocentesCreativos
- US: 150, UK: 30, Canada: 25, Australia: 20, Mexico/LATAM: 40, Other: 35

C) EDUCATIONAL CONTENT CREATORS (200 total)
Search: #LearnOnTikTok #EdTech #EducationalApps #LearningApps #STEMEducation
#KidsActivities #LearningThroughPlay #EarlyChildhoodEducation #Preschool
#Kindergarten #ElementaryEducation #MiddleSchool #HighSchool
#BilingualEducation #ESLTeacher #ELLTeacher #SpecialNeeds #Autism
#ADHD #Dyslexia #GiftedEducation #TwiceExceptional
- Global distribution: prioritize English and Spanish-speaking markets

D) KID & FAMILY TECH REVIEWERS (100 total)
Search: "best educational apps for kids" "app review for kids" "edtech review"
"kids technology" "screen time" "digital parenting" "family tech"
#KidsTech #FamilyTech #DigitalParenting #ScreenTime #AppReview
#TechForKids #EdTechReview #ParentTechTips
- Global: focus on YouTube and blog creators

E) BILINGUAL/MULTILINGUAL EDUCATION (100 total)
Search: #BilingualKids #BilingualParenting #SpanishForKids #EnglishForKids
#CrianzaBilingüe #NiñosBilingües #BilingualFamily #HerritageLanguage
#DualLanguage #LanguageLearning #ESLKids #ELLStudents
#MultilingualFamily #RaisingBilingualKids #SpanishImmersion
- Prioritize US Hispanic, Mexico, Spain, Colombia, Argentina markets
```

## 1.3 — Top Influencer Talent Agencies & Management Companies

```
TASK: Research the top influencer talent management agencies and MCN (Multi-Channel 
Networks) that represent parenting, education, family, and kids content creators.

For EACH agency provide:
- Agency name
- Website URL
- Contact email / phone / submission form URL
- Headquarters location
- Number of creators represented (approximate)
- Key creator verticals (parenting, education, family, kids, lifestyle)
- Notable creators they represent (list 5-10 names)
- Minimum creator follower threshold
- Typical deal structures they prefer
- Whether they handle kids/education brands specifically
- Regions/countries they operate in

TARGET AGENCIES TO RESEARCH (and find more):
- Digital Brand Architects (DBA)
- Viral Nation
- Obviously
- Gleam Futures
- Studio71
- Whalar
- The Influencer Marketing Factory
- Collectively
- Socialyte
- Shine Talent Group
- MGMT Entertainment
- Select Management Group
- Creator Authority
- Cycle (formerly Fullscreen)
- Underscore Talent
- WME (William Morris Endeavor) — Digital division
- CAA (Creative Artists Agency) — Digital division
- UTA (United Talent Agency) — Digital division
- Paradigm Talent Agency
- ICM Partners
- Night Media
- Hi Creators
- The Mom Agency
- Sway Group (specializes in mom influencers)
- Clever (Clever Girls, mom/parenting focused)
- Mavrck
- AspireIQ
- [Find 20+ more agencies]

ALSO FIND:
- Agencies that specifically represent HISPANIC/LATINO influencers
- Agencies in UK, Australia, Canada, India that handle family creators
- Agencies that specialize in TEACHER / EDUCATION influencers
- Micro-influencer collectives and networks
```

## 1.4 — Influencer Marketing Platforms & Databases

```
TASK: Compile a comprehensive list of ALL influencer marketing platforms, 
databases, and discovery tools available in 2026.

For EACH platform provide:
- Platform name
- Website URL
- Pricing (free tier? paid plans? cost range)
- Number of influencers in database
- Key features (search filters, outreach tools, campaign management, analytics)
- Supported social platforms (TikTok, IG, YouTube, etc.)
- Best for (size of brand, use case)
- Free trial available?
- Geographic coverage
- API available?

PLATFORMS TO RESEARCH (and find more):
Free/Freemium:
- TikTok Creator Marketplace
- Instagram Creator Marketplace
- YouTube BrandConnect
- Collabstr
- Influence.co
- Shoutcart
- BrandSnob
- Heepsy (free tier)
- Modash (free tier)

Paid:
- Later Influence (formerly Mavrck)
- Upfluence
- Grin
- CreatorIQ
- Traackr
- Klear
- HypeAuditor
- NinjaOutreach
- BuzzSumo
- AspireIQ (Aspire)
- Tribe
- Julius
- Dovetale (now part of Shopify)
- Afluencer
- Brandbassador
- impact.com (influencer module)
- Refersion
- IZEA
- Tagger (now part of Sprout Social)
- Meltwater (influencer module)
- Sprinklr (influencer module)
- Brandwatch (influencer module)

Find 30+ additional platforms across different markets and price points.
```

---

# PART 2: SOCIAL MEDIA & MARKETING VENUES WORLDWIDE

## 2.1 — Top 500 Social Media Platforms Worldwide

```
TASK: Compile a comprehensive directory of the top 500 social media platforms, 
content platforms, and community sites worldwide — organized by region. Include 
platforms where Koydo could potentially build presence, run ads, or find 
influencer partners.

For EACH platform provide:
- Platform name
- URL
- Monthly Active Users (MAU)
- Primary country/region
- Primary language(s)
- Content type (text, video, image, audio, mixed)
- Primary demographics (age, gender skew)
- Advertising available? (yes/no, link to ad platform)
- Influencer/creator ecosystem? (yes/no)
- Relevance to Koydo (1-5 scale, with explanation)
- Self-serve ads? (yes/no, minimum budget)

ORGANIZE BY REGION:

A) GLOBAL / MULTI-REGION (Top 50)
- Facebook, Instagram, TikTok, YouTube, X (Twitter), LinkedIn, Pinterest, 
  Snapchat, Reddit, WhatsApp, Telegram, Discord, Threads, Bluesky, Mastodon,
  Quora, Medium, Substack, BeReal, Lemon8, etc.
  Find ALL platforms with 10M+ global MAU.

B) UNITED STATES & CANADA (50 platforms)
- Major: All global platforms
- Niche: Nextdoor, Clubhouse, Fishbrain, Strava, Goodreads, Wattpad, etc.
- Education-specific: Edmodo, Schoology, Google Classroom (community), 
  Canvas communities, Clever, ClassDojo
- Parenting-specific: Peanut, Winnie, Tinybeans, FamilyWall, 
  Cozi Family Organizer, What to Expect community
- Find ALL US/Canada platforms with 1M+ users

C) LATIN AMERICA — Mexico, Colombia, Argentina, Chile, Peru, Brazil (80 platforms)
- Major: WhatsApp (#1 in LATAM), Facebook, Instagram, TikTok, YouTube, X
- Regional: Taringa!, Fotolog, sonico, Badoo, Kwai
- Messaging: WhatsApp, Telegram (massive in Brazil/Mexico)
- Education: platforms used by LATAM educators
- Brazilian-specific: Orkut successors, Koo (briefly), 
  Twitter is massive in Brazil
- Find ALL LATAM platforms with 500K+ users

D) UNITED KINGDOM & IRELAND (40 platforms)
- All global + UK-specific: Mumsnet (HUGE for UK parents), Netmums, 
  BabyCenter UK, Gransnet, TES (teacher community), etc.

E) EUROPE — Germany, France, Spain, Italy, Netherlands, Nordics (60 platforms)
- VK (Russia/Eastern Europe), StudiVZ, XING, Jodel, Vero, 
  Tuenti (Spain), Skyrock (France), etc.
- Education platforms for each country
- Parenting forums for each country

F) INDIA, PAKISTAN, BANGLADESH, SRI LANKA (50 platforms)
- ShareChat, Moj, Josh, Roposo, Koo, Helo, Chingari, MX TakaTak, 
  Pratilipi, DailyHunt, etc.
- Major: WhatsApp (#1), YouTube, Instagram, Facebook, TikTok (if unbanned)
- Education-specific: BYJU'S community, Unacademy, Vedantu, Toppr, 
  Doubtnut community features

G) SOUTHEAST ASIA — Philippines, Indonesia, Malaysia, Thailand, Vietnam (40 platforms)
- LINE (Thailand/Japan), KakaoTalk (Korea), Zalo (Vietnam), 
  GrabChat, Kumu (Philippines), etc.

H) EAST ASIA — Japan, South Korea, China, Taiwan (50 platforms)
- LINE, KakaoTalk, Naver, Daum Cafe, mixi
- China: WeChat, Weibo, Douyin, Xiaohongshu (RED), Bilibili, 
  Zhihu, Baidu Tieba, QQ, Kuaishou
- Japan: LINE, mixi, note.com, Ameblo
- Korea: KakaoTalk, Naver Blog/Cafe, Band, Cyworld (revival)

I) MIDDLE EAST & NORTH AFRICA (30 platforms)
- Baaz, YallaBina, Harakat, etc.
- Instagram and TikTok are massive in MENA
- YouTube is #1 video platform in Saudi Arabia/UAE/Egypt

J) SUB-SAHARAN AFRICA — Nigeria, South Africa, Kenya, Ghana (30 platforms)
- 2go, Mxit (legacy), Opera News, Scooper, WhatsApp (dominant)
- Facebook is #1 social platform in most African markets

K) AUSTRALIA & NEW ZEALAND (20 platforms)
- All global platforms + regional forums
- Essential Baby (parenting community)
- BubHub (parenting)

OUTPUT FORMAT: Structured table with all fields per platform.
```

## 2.2 — Education-Specific Online Communities & Forums

```
TASK: Compile a comprehensive directory of ALL education-specific online 
communities, forums, groups, and platforms where parents, teachers, and 
homeschoolers gather to discuss educational resources and curricula.

CATEGORIES:

A) FACEBOOK GROUPS (find top 200 groups):
Search for groups related to:
- Homeschooling (general, secular, Christian, Waldorf, Montessori, Charlotte Mason,
  Classical, Unschooling, eclectic)
- Homeschooling by state (all 50 US states)
- Homeschooling by country (UK, Canada, Australia, Mexico, etc.)
- Special needs homeschooling
- Bilingual homeschooling
- Black homeschoolers
- Military homeschoolers
- Working parents who homeschool
- Educational apps and technology for kids
- Parenting by age group (toddlers, elementary, middle school, high school)
- Teacher communities (elementary, STEM, special ed, etc.)
- Curriculum-specific (Math-U-See, Saxon, Teaching Textbooks, etc.)

For each group: Name, URL, member count, activity level, posting rules 
(do they allow promotions?), admin contact if visible

B) REDDIT COMMUNITIES (find top 100 subreddits):
- r/homeschool, r/Parenting, r/Teachers, r/education, r/edtech,
  r/ScienceParents, r/specialeducation, r/ADHD (parents), r/Autism,
  r/GiftedKids, r/Montessori, r/Waldorf, r/Charlotte_Mason,
  r/ECEProfessionals, r/teaching, r/highschool, r/elementaryschool,
  r/preschool, r/toddlers, r/Mommit, r/daddit, r/beyondthebump,
  r/NewParents, r/breakingmom, r/AttachmentParenting
  Find 75+ more education/parenting subreddits

C) DISCORD SERVERS (find top 50):
- Homeschool communities
- Teacher communities  
- EdTech communities
- Study communities
- Parenting communities

D) STANDALONE FORUMS & COMMUNITIES (find top 100):
- WellTrainedMind Forums (classical education)
- The Homeschool Mom (thehomeschoolmom.com) forums
- Hip Homeschool Moms community
- Mumsnet (UK — massive, opinionated)
- Netmums (UK)
- BabyCenter community forums
- What to Expect community
- Motherly community
- Essential Baby (Australia)
- BubHub (Australia)
- Parents.com community
- Scary Mommy community
- City-Data parenting forums
- DC Urban Mom (DMV area, very active)
- Berkeley Parents Network
- Park Slope Parents
- [City]-specific parent networks (find top 30 US cities)
- Teachers Pay Teachers community/forums
- Edutopia community comments
- Chronicle of Higher Education forums (for Mastery Studio age group)
- A2K Forums (education discussions)
- [Find 50+ more forums worldwide]

E) WHATSAPP & TELEGRAM GROUPS
- Note: These are harder to find but extremely important in LATAM, 
  India, Africa, and Middle East
- Search for education/parenting WhatsApp community links
- Search for homeschool Telegram channels
- Provide guidance on how to find and join relevant groups

OUTPUT: Structured list with name, URL, platform, member count, 
activity level, promotion rules, geography, language
```

## 2.3 — Education Review Sites, Directories & Award Programs

```
TASK: Compile a comprehensive list of ALL websites, directories, review 
platforms, and award programs where educational apps and EdTech products 
can be listed, reviewed, or recognized.

A) REVIEW SITES & DIRECTORIES (find 100+):
- Common Sense Media (commonsensemedia.org)
- Common Sense Education (commonsense.org/education)
- EdSurge Product Index
- Graphite (Common Sense Education tool)
- Educational App Store (educationalappstore.com)
- Teachers With Apps
- Smart Apps for Kids
- BestAppsForKids.com
- Tech with Kids
- AppAdvice (Education category)
- Apps Gone Free (education section)
- Homeschool.com (resource directory)
- The Homeschool Mom resource directory
- Cathy Duffy Reviews (influential in homeschool community)
- Rainbow Resource Center (homeschool retailer/reviewer)
- Christianbook.com (homeschool resources)
- Educators Technology (educatorstechnology.com)
- TeachThought
- Getting Smart
- The EdTech Roundup
- EdTech Digest
- EdTech Review
- EdTech Magazine
- eSchool News
- THE Journal
- District Administration
- School Library Journal
- Booklist (ALA)
- Kirkus Reviews (for audiobook content)
- [Find 70+ more worldwide]

B) AWARD PROGRAMS (find 50+):
- CODiE Awards (SIIA — Software & Information Industry Association)
- ISTE Seal of Alignment
- Tech & Learning Awards of Excellence
- EdTech Digest Awards
- EdTech Breakthrough Awards
- Global EdTech Startup Awards (GESA)
- ASU+GSV Cup
- BETT Awards (UK)
- Australian Education Awards
- Reimagine Education Awards
- QS Reimagine Education
- Learning Impact Awards (1EdTech/IMS Global)
- Webby Awards (Education category)
- Parents' Choice Awards
- National Parenting Product Awards (NAPPA)
- Mom's Choice Awards
- Tillywig Toy Awards (education category)
- Academic's Choice Smart Media Award
- Teachers' Choice Award (Learning Magazine)
- Creative Child Awards
- [Find 30+ more globally]

For each: Name, URL, submission process, deadline/cycle, cost to enter,
judging criteria, prestige level (1-5), geographic scope
```

## 2.4 — Education Conferences, Expos & Events

```
TASK: Research ALL major education, EdTech, parenting, and homeschool 
conferences, expos, and events worldwide where Koydo could exhibit, 
present, speak, or network.

For EACH event provide:
- Event name
- Website URL
- Location (city, country)
- Dates (2026 schedule or typical timing)
- Attendee count
- Attendee type (teachers, admins, parents, investors, EdTech companies)
- Exhibitor booth cost (if available)
- Speaker submission URL/process
- Startup/new product showcase opportunities
- Networking value (1-5)
- Relevance to Koydo (1-5)

CATEGORIES:

A) MAJOR EDTECH CONFERENCES (find 50+):
- ISTE (International Society for Technology in Education)
- SXSW EDU
- ASU+GSV Summit
- FETC (Future of Education Technology Conference)
- BETT (UK — biggest worldwide EdTech conference)
- Educause
- Learning Forward
- ASCD Annual Conference
- NAIS Annual Conference (private schools)
- iNACOL/Aurora Institute (online learning)
- CoSN Annual Conference
- TCEA Convention (Texas — huge)
- CUE (California educators)
- NCCE (Pacific Northwest)
- MACUL (Michigan)
- PETE&C (Pennsylvania)
- [Find equivalent for every US state + major countries]

B) HOMESCHOOL CONVENTIONS (find 50+):
- Great Homeschool Conventions (multi-city US tour)
- CHEA Convention (California)
- THSC Convention (Texas)
- FPEA Convention (Florida)
- CHAP Convention (Pennsylvania)
- INCH Convention (Indiana)
- NCHE Conference (North Carolina)
- [List conventions for all 50 US states]
- UK/Australia/Canada homeschool conventions

C) PARENTING & FAMILY EXPOS (find 30+):
- Baby Shows (UK)
- The Baby Show (US cities)
- NYC Kids Expo
- LA Kids Expo
- National Parenting Product Awards events
- Mom 2.0 Summit
- BlogHer/SHE Media events
- [Find events in major cities worldwide]

D) STARTUP & TECH EVENTS WITH EDTECH TRACKS (find 30+):
- TechCrunch Disrupt
- Web Summit (Lisbon)
- Collision (Toronto)
- Slush (Helsinki)
- Product Hunt meetups
- Y Combinator Demo Day (for future fundraising awareness)
- Startup Grind
- [Major tech events with education tracks]
```

---

# PART 3: MARKETING CAMPAIGN MEDIA GENERATION PROMPTS

## 3.1 — Social Media Content Creation Prompts (200+ Prompts)

### TikTok / Instagram Reels Video Scripts

```
Generate a complete video script (15-60 seconds) for each of the following 
concepts. Include: Hook (first 2-3 seconds), body, call-to-action, 
recommended audio/music style, text overlay suggestions, and hashtags.

PARENT-FOCUSED HOOKS:
1. "POV: You found an educational app that your kid ACTUALLY wants to use"
2. "Wait, your kid is ASKING to learn? Mine too. Here's why..."
3. "Tell me you use Koydo without telling me you use Koydo"
4. "Things I wish I knew before downloading 47 different learning apps"
5. "My child's screen time before vs. after Koydo" (side by side)
6. "How my 4-year-old learned to read in 3 months (not clickbait)"
7. "Unpopular opinion: Screen time isn't bad if it's THIS"
8. "I'm embarrassed to say my kid taught ME something from an app"
9. "The moment I stopped feeling guilty about screen time"
10. "When the app is so good your kid forgets it's educational"
11. "3 things I look for in an educational app (as a teacher AND mom)"
12. "Showing my husband the app that finally got our kid off YouTube"
13. "Rating educational apps I've actually used with my kids"
14. "The $0 educational app that replaced our $200/month tutor"
15. "Day in the life of a homeschool mom ft. Koydo"
16. "When your kid's AI companion teaches them more than you expected"
17. "Summer slide? Not with this app."
18. "Back to school prep no one talks about: the right apps"
19. "Bilingual mom hack: one app, two languages, zero stress"
20. "I let my 6-year-old choose: YouTube or Koydo. She chose Koydo."

HOMESCHOOL-FOCUSED HOOKS:
21. "Homeschool curriculum review: Koydo (honest take)"
22. "How I use AI companions in our homeschool routine"
23. "The free app that covers K-12 — I'm not kidding"
24. "Adding Koydo to our Charlotte Mason routine"
25. "Homeschool mom confession: I use AI to help teach my kids"
26. "Why I replaced 3 paid apps with 1 free one"
27. "What a homeschool day looks like with Koydo"
28. "Curriculum that grows with your kid from age 3 to 18"
29. "The only app on my 'approved' homeschool list"
30. "Homeschool hack: free educational app with spaced repetition built in"

TEACHER-FOCUSED HOOKS:
31. "Teachers: this app gives FREE classroom access during school hours"
32. "Found: an app that actually aligns with curriculum standards"
33. "The AI companion that helps with differentiated instruction"
34. "When your struggling reader finally engages (thanks to the right app)"
35. "Free EdTech that ACTUALLY works in the classroom"
36. "Sub plan hack: Koydo's AI companions can lead mini-lessons"
37. "Real talk: most educational apps are terrible. This one isn't."
38. "The app my students BEG to open during free time"
39. "Tech Tuesday recommendation your students will love"
40. "Assessment ≠ boring when AI makes it a conversation"

EMOTIONAL / VIRAL HOOKS:
41. "I cried when my non-verbal child started engaging with Aria" 
42. "My child's face when the AI companion remembered their name"
43. "The moment education stopped being a battle"
44. "Before Koydo vs. After Koydo (emotional parent moment)"
45. "When your child says 'I love learning' and MEANS it"
46. "Single mom hack: AI companions as study buddies"
47. "Plot twist: the free app works better than the $30/month one"
48. "My kid just asked me to cancel Netflix and keep Koydo"
49. "Why my special needs child thrives with AI-powered learning"
50. "Immigrant parent joy: my kid learning in BOTH our languages"

TRENDING FORMAT ADAPTATIONS:
51-60. "Get Ready With Me but it's setting up my kid's learning app"
61-70. "A day in my life as a [homeschool mom / teacher / parent of 4]"
71-80. "Things that just make sense: [educational screen time]"
81-90. "POV: You're a parent in 2026 and you just discovered..."
91-100. "I tried [thing] for 30 days — here's what happened"
```

### Instagram Carousel Content Prompts

```
Generate complete carousel content (8-10 slides each) for each topic. 
Include: Cover slide headline, each slide's text (keep concise), design 
notes, and caption with CTA + hashtags.

EDUCATIONAL / INFORMATIONAL:
101. "Screen Time Guidelines by Age — What Science Actually Says (2026)"
102. "5 Signs Your Child's 'Educational' App is Actually Junk"
103. "The Parent's Guide to AI in Education: What You Need to Know"
104. "Age-by-Age Learning Milestones: Is Your Child On Track?"
105. "Free vs. Paid Educational Apps: What Are You Actually Getting?"
106. "7 Questions to Ask Before Downloading Any Kids' App"
107. "The Science of Spaced Repetition (and Why It Matters for Your Child)"
108. "Bilingual by Design: How to Raise Multilingual Children in 2026"
109. "COPPA, FERPA, and Your Child's Data: A Parent's Guide"
110. "10 Red Flags in Children's Apps That Most Parents Miss"

COMPARISON / "BEST OF" LISTS:
111. "Top 10 Free Educational Apps for Preschoolers (2026)"
112. "Top 10 Free Educational Apps for Elementary Students"
113. "Top 10 Free Educational Apps for Middle & High School"
114. "Homeschool Curriculum Comparison: Digital vs. Traditional"
115. "Reading Apps Face-Off: Which Actually Teaches Your Child?"
116. "Math Apps for Kids: Honest Ranking (We Tested 15)"
117. "The Ultimate Homeschool App Toolkit (Our Top 5)"
118. "AI Tutor vs. Human Tutor: When to Use Each"
119. "Free EdTech Tools Every Teacher Needs in 2026"
120. "Koydo vs. Khan Academy vs. ABCmouse — Feature Comparison"

PARENT TIPS & HACKS:
121. "How to Create a Screen Time Schedule That Actually Works"
122. "5 After-School Routines That Include 'Smart' Screen Time"
123. "How to Tell If Your Child Is Actually Learning from an App"
124. "Summer Learning Plan: Prevent the 'Summer Slide' in 30 Min/Day"
125. "Morning Routine Hack: 15 Minutes of Learning Before School"
126. "How We Use AI to Supplement Our Homeschool"
127. "Travel Learning: Best Apps for Long Car Rides and Flights"
128. "Weekend Learning Activities for Every Age Group"
129. "How to Make Learning Fun When Your Kid Hates School"
130. "Digital Citizenship: Teaching Kids to Use Tech Responsibly"

BRAND STORYTELLING:
131. "Why We Built Koydo: Our Founder's Story"
132. "Meet Aria & Kai: The AI Companions Behind the Learning"
133. "How Koydo Works: From First Login to Mastery"
134. "Our Promise: Quality Education Shouldn't Cost a Fortune"
135. "Behind the Scenes: How We Design Lessons for Every Age"
```

### Blog / SEO Article Prompts

```
Write a comprehensive, SEO-optimized blog post (2000-3000 words) for each 
topic. Include: H1 title (with primary keyword), meta description (155 chars), 
target keywords, outline with H2/H3 structure, internal linking opportunities 
to Koydo features, and a CTA at the end.

PILLAR CONTENT (cornerstone pieces, 3000-5000 words each):
136. "The Complete Guide to Educational Apps for Kids in 2026"
137. "How to Start Homeschooling: A Beginner's Complete Guide"
138. "Screen Time for Kids: Everything Parents Need to Know in 2026"
139. "AI in Education: How Artificial Intelligence is Changing How Children Learn"
140. "Bilingual Education at Home: The Complete Parent's Guide"

LONG-TAIL SEO ARTICLES (2000 words each):
141. "Best Free Educational Apps for 3-Year-Olds (2026)"
142. "Best Free Educational Apps for 5-Year-Olds"
143. "Best Free Educational Apps for 8-Year-Olds"
144. "Best Free Educational Apps for 11-Year-Olds"
145. "Best Free Educational Apps for 14-Year-Olds"
146. "Best Free Educational Apps for High Schoolers (2026)"
147. "Best Homeschool Apps for Multiple Ages (2026 Guide)"
148. "How Much Screen Time Should a [3/5/8/11/14]-Year-Old Have?"
149. "Free Math Apps That Actually Teach (Not Just Drill)"
150. "Free Reading Apps for Kids Who Hate Reading"
151. "Best Apps for Kids with ADHD (2026)"
152. "Best Apps for Kids with Dyslexia"
153. "Best Apps for Autistic Children"
154. "Best Apps for Gifted Children Who Need Enrichment"
155. "Best Spanish Learning Apps for Kids (Free & Paid)"
156. "Spaced Repetition for Kids: What It Is and Why It Works"
157. "AI Tutors vs Human Tutors: A Comprehensive Comparison"
158. "How to Evaluate if an Educational App is Worth Paying For"
159. "Common Core Aligned Apps: What Parents & Teachers Need to Know"
160. "Summer Learning Loss: Prevention Strategies for Every Age"
161. "Homeschool Schedule Templates: Daily & Weekly (Free Download)"
162. "How to Supplement Public School Education at Home"
163. "COPPA Compliant Apps: How to Check Before You Download"
164. "The Benefits of AI Companions in Children's Education"
165. "How to Make Audiobooks Part of Your Child's Learning Routine"
166. "Interactive Learning Games vs. Worksheets: What Works Better?"
167. "Teaching Kids in Two Languages: Strategies That Work"
168. "Back to School Tech Guide for Parents (2026)"
169. "After-School Learning: How 30 Minutes of App Time Boosts Grades"
170. "Why Free Educational Apps Are Getting Better Than Paid Ones"
```

### YouTube Video Title + Description Prompts

```
Generate optimized titles, descriptions (with timestamps), and thumbnail 
concepts for each video topic:

171. "I Tried EVERY Free Educational App for Kids — Here's The Best One"
172. "Honest Koydo Review After 30 Days (Mom of 3)"
173. "Our Complete Homeschool Routine 2026 (Apps We Actually Use)"
174. "FREE Learning App That Covers K-12?! Testing Koydo"
175. "AI Companions for Kids: Cool or Creepy? (Parent Review)"
176. "Top 5 Educational Apps My Kids Actually WANT to Use"
177. "How We Teach Our Kids Two Languages Using AI"
178. "Screen Time That Doesn't Rot Your Kid's Brain (App Picks 2026)"
179. "Trying Koydo for the First Time — Kids React!"
180. "Why This Free App is Better Than $30/Month Subscriptions"
```

### Pinterest Pin Copy Prompts

```
Generate pin title, description (500 chars with keywords), and visual 
concept for each:

181. "Free Educational Apps for Preschoolers 2026 — Complete Guide"
182. "Homeschool Curriculum Checklist (Free Printable)"
183. "Age-by-Age Screen Time Guidelines — Save This!"
184. "30-Day Summer Learning Challenge for Kids (Free)"
185. "Bilingual Learning Activities for Kids — Spanish & English"
186. "Best Free Learning Games by Age Group 2026"
187. "How to Create a Homeschool Schedule (Free Template)"
188. "10 Signs Your Child is Ready for Educational Screen Time"
189. "Math Practice App Comparison Chart — Free Printable"
190. "Reading Level Assessment Guide for Parents"
```

### Email Marketing Prompts

```
Write complete email copy (subject line, preview text, body, CTA) for each:

WELCOME SERIES (5 emails):
191. Welcome Email: "Your child's learning adventure starts now"
192. Day 2: "Here's how other parents use Koydo in their daily routine"
193. Day 4: "Meet Aria & Kai — your child's new AI study companions"
194. Day 7: "3 features you probably haven't discovered yet"
195. Day 10: "Ready to unlock the full experience? (upgrade offer)"

ENGAGEMENT EMAILS:
196. Weekly digest: "Here's what [Child Name] learned this week"
197. Achievement: "🎉 [Child Name] just reached a new milestone!"
198. Re-engagement: "We miss [Child Name]! Here's what's new"
199. Seasonal: "Summer learning plan — prevent the slide in 15 min/day"
200. Referral: "Give a friend free learning, get a free month"
```

## 3.2 — Paid Ad Creative Prompts (100 Prompts)

```
Generate complete ad copy (headline, primary text, description, CTA button 
text) for each. Include targeting recommendations.

META (FACEBOOK + INSTAGRAM) ADS:
201. Awareness: "Screen time you can feel good about" (target: all parents 25-45)
202. Awareness: "K-12 education, one app, zero cost to start" (target: all parents)
203. Awareness: "AI companions that make learning personal" (target: tech-savvy parents)
204. Interest: "See why 10,000 families choose Koydo" (social proof, retargeting)
205. Interest: "What parents are saying about Koydo" (testimonial carousel)
206. Conversion: "Start your free account in 30 seconds" (retarget engaged visitors)
207. Conversion: "Upgrade to Family Plan — all your kids, one price" (retarget free users)
208-215. [Generate 8 more for each stage of funnel × parent segment]

GOOGLE SEARCH ADS:
216. "free educational app for kids" → ad copy
217. "best learning app for 5 year olds" → ad copy
218. "homeschool curriculum app" → ad copy
219. "khan academy alternative free" → ad copy
220. "educational screen time app" → ad copy
221. "bilingual learning app spanish english" → ad copy
222. "AI tutor for kids" → ad copy
223. "reading app for struggling readers" → ad copy
224. "math practice app elementary" → ad copy
225. "free school app for teachers" → ad copy
226-240. [Generate 15 more for long-tail education keywords]

GOOGLE APP CAMPAIGN TEXT IDEAS:
241-250. Generate 10 text ideas (4 lines each, 25 chars per line) for Google 
         App Campaigns targeting education app installs

APPLE SEARCH ADS:
251-260. Generate 10 custom product page variations for Apple Search Ads, 
         each with unique screenshots, subtitle, and promotional text 
         targeting different keyword clusters

TIKTOK SPARK ADS:
261. Script for "organic-feeling" ad: parent discovering Koydo naturally
262. Script: kid's face reaction when AI companion talks to them  
263. Script: side-by-side "boring app vs. Koydo" comparison
264. Script: "Things I'd tell my past self as a parent" educational version
265. Script: teacher showing classroom using Koydo during free period
266-275. [Generate 10 more TikTok-native ad scripts]

PINTEREST PROMOTED PINS:
276-285. Generate 10 pin concepts with text overlay, each targeting different 
         educational search terms on Pinterest

YOUTUBE PRE-ROLL ADS (6-second bumpers):
286-290. Generate 5 six-second bumper ad scripts (must hook in 2 seconds)

YOUTUBE IN-STREAM ADS (15-30 seconds):
291-295. Generate 5 in-stream ad scripts with skip-proof hooks

RETARGETING AD SEQUENCES:
296. Day 1 after website visit: "Still thinking about it?"
297. Day 3: "Here's what parents are saying..."
298. Day 7: "Your child could be learning right now"
299. Day 14: "Limited time: 50% off first month of Learning Plus"
300. Day 30: "We've added new features since your last visit"
```

## 3.3 — Print, Presentation & Physical Marketing Prompts

```
Generate complete content/copy for each:

FLYERS & BROCHURES:
301. One-page parent flyer for pediatrician waiting rooms
302. One-page teacher flyer for faculty lounges
303. One-page homeschool co-op flyer 
304. Tri-fold brochure: Koydo overview (all tiers)
305. Tri-fold brochure: Koydo for Schools

POSTERS:
306. Elementary school hallway poster ("Learning Adventures Await")
307. Library poster ("Recommended Learning App")
308. Pediatrician office poster ("Screen Time Rx: Education")
309. Conference booth banner (pull-up banner copy)
310. Window cling for partner locations

PRESENTATION DECKS:
311. 10-slide pitch deck for school district administrators
312. 5-slide lightning talk for EdTech conference
313. 15-slide parent information night presentation
314. 8-slide investor/partner overview
315. 10-slide homeschool convention presentation

BUSINESS CARDS & PROMO MATERIALS:
316. Business card design brief (front + back)
317. Sticker design concepts (5 variations for kids)
318. Bookmark design (for library partnerships)
319. Referral card ("Give a month, get a month")
320. Conference swag bag insert card
```

---

# PART 4: BRAND & VISUAL IDENTITY PROMPTS

## 4.1 — Logo Creation & Refinement Prompts

```
Use these prompts with AI image generators (Midjourney, DALL·E, Ideogram, 
Leonardo, Stable Diffusion) to explore logo concepts:

PRIMARY LOGO CONCEPTS:
321. "Minimal modern education app logo for 'Koydo', featuring a stylized 
book or open page morphing into a digital screen, warm gradient colors 
(coral, amber, teal), clean sans-serif typography, suitable for app icon 
and website, white background, vector style"

322. "Friendly educational brand logo for 'Koydo', incorporating a subtle 
owl or fox mascot integrated with the letter K, playful but sophisticated, 
pastel color palette with pops of coral and emerald, rounded typography, 
kid-friendly but not childish, app icon compatible"

323. "Modern EdTech startup logo for 'Koydo', abstract geometric shape 
representing growth/learning/progression (stacking blocks, upward spiral, 
ascending stairs), gradient from deep navy to bright teal, clean minimalist 
sans-serif font, scalable from favicon to billboard"

324. "Dual-tone education logo for 'Koydo', design should work in both 
light and dark themes, incorporating AI/technology element (subtle circuit 
pattern, neural network nodes) combined with human/organic element (leaf, 
child silhouette, crayon stroke), professional yet approachable"

325. "Wordmark logo for 'Koydo' with custom letterforms, the 'o' letters 
forming eyes or faces of AI companions, playful ligatures, warm color 
palette, works at small sizes for mobile app icon, distinctive and memorable"

APP ICON VARIATIONS:
326. "Square app icon for education app 'Koydo', bold single letter 'K' with 
gradient background (coral to amber), rounded corners, must be recognizable 
at 64x64 pixels, modern flat design, no text other than the K"

327. "App icon featuring two small AI companion characters (one warm-toned, 
one cool-toned) peeking from behind a book, rounded square format, vibrant 
but not garish, education app for children ages 3-18"

328. "Minimalist app icon, abstract 'K' formed from book pages fanning open, 
single color on gradient background, Google Play Store and iOS App Store 
compliant, instantly communicates 'education' and 'technology'"

329. "Split-tone app icon: left half shows analog (book, pencil, nature) 
and right half shows digital (screen, AI, circuit), unified in the center 
by the Koydo brandmark, warm meets cool palette"

330. "Collection of 5 app icon variations for A/B testing: (a) letter-based, 
(b) mascot-based, (c) abstract-symbol, (d) illustration-style, 
(e) photography-based — all education-themed, vibrant, child-friendly"

MASCOT / CHARACTER DESIGN:
331. "Character design sheet for 'Aria', a warm friendly AI companion for 
an education app. She should look approachable and wise, with elements 
suggesting both technology (subtle geometric patterns) and warmth (soft 
curves, warm color palette). NOT robotic-looking. Suitable for ages 3-18. 
Multiple expressions: happy, encouraging, thinking, celebrating, explaining. 
Full body, 3/4 view, and close-up face. Clean vector illustration style."

332. "Character design sheet for 'Kai', a cool adventurous AI companion. 
He should look energetic and curious, with elements suggesting exploration 
and discovery. Cool color palette (teals, blues, greens) with warm accent. 
Complements Aria visually. Same expression set and view requirements."

333. "Scene illustration: Aria and Kai together helping a child study, 
warm lighting, cozy learning environment, diverse child representation, 
suitable for marketing materials and in-app illustration"

334. "Emoji/sticker set for Aria and Kai: 20 expressions each including 
thumbs up, mind blown, thinking, celebrating, high five, confused, 
sleeping, studying, excited, proud — suitable for in-app rewards and 
social media sharing"

335. "Social media avatar variations: Aria and Kai in seasonal themes 
(back to school, holiday, summer, spring), cultural celebration variants 
(Día de los Muertos, Lunar New Year, Diwali, etc.), suitable for profile 
pictures and story highlights"
```

## 4.2 — Brand Visual System Prompts

```
BRAND GUIDELINES:
336. "Create a comprehensive brand style guide for Koydo including: 
primary and secondary color palettes with hex codes, typography system 
(heading, body, accent fonts), spacing and grid system, photography style 
guidelines, illustration style guidelines, do's and don'ts, social media 
templates, email templates, presentation templates"

SOCIAL MEDIA TEMPLATES:
337. "Instagram post template kit (10 templates): quote cards, tip cards, 
comparison cards, testimonial cards, announcement cards, stat cards, 
question cards, meme-format cards, carousel covers, story templates — 
all in Koydo brand colors"

338. "TikTok/Reels thumbnail template kit (10 templates): bold text hooks, 
face + text overlays, before/after split frames, ranking formats, 
reaction formats — branded with Koydo visual identity"

339. "YouTube thumbnail template kit (10 templates): high contrast, 
big text, expressive faces, clean composition, education-theme specific"

340. "Pinterest pin template kit (10 templates): tall format (1000x1500px), 
blog post pins, infographic pins, checklist pins, resource list pins, 
how-to pins — branded"

EMAIL DESIGN:
341. "Email newsletter template: header with Koydo branding, section 
layouts for weekly learning stats, featured content, parent tips, and CTA 
buttons — responsive design for mobile"

AD CREATIVE:
342. "Facebook/Instagram ad template kit: 5 square (1:1), 5 story (9:16), 
5 landscape (16:9) — each with product screenshots, lifestyle imagery 
placeholders, headline/CTA zones, Koydo branding"

343. "Google Display Network banner ad set: 300x250, 728x90, 160x600, 
300x600, 320x50 — all sizes, education theme, clear CTA"

PRINT:
344. "Business card design: front with logo + name/title, back with 
QR code linking to koydo.com, clean modern design, premium feel"

345. "Conference booth design: 8ft pull-up banner + table throw + 
handout card — cohesive branded experience"

APP STORE ASSETS:
346. "Google Play Store feature graphic (1024x500px): showcasing Koydo 
app with Aria & Kai characters, diverse children engaging, headline 
text, vibrant gradient background"

347. "iOS App Store preview screenshots (6.7" and 6.1" sizes): 
10 screenshot concepts showing key features, each with headline text 
overlay, consistent visual style, tells a story across the set"

348. "App Store promotional artwork for 'Featured App' consideration: 
hero image, editorial artwork, and story card — Apple design guidelines 
compliant"

SEASONAL / CAMPAIGN VISUALS:
349. "Back-to-School campaign visual kit: social posts, email header, 
website banner, app store seasonal screenshots — August/September theme"

350. "Summer Learning campaign visual kit: prevent summer slide messaging, 
outdoor/adventure learning theme, bright vibrant colors"

351. "Holiday Gift Guide campaign: 'Give the gift of learning' theme, 
gift card mockups, family-themed imagery, warm winter palette"

352. "New Year / New Learning campaign: fresh start messaging, goal 
setting for families, resolution-themed"

353. "Hispanic Heritage Month campaign: bilingual celebration, cultural 
pride + education, Spanish-language visuals"

354. "Teacher Appreciation Week campaign: celebrating educators, 
classroom-themed, Free classroom access messaging"

355. "World Read Aloud Day campaign: audiobook feature highlight, 
family reading moments, cozy illustration style"
```

---

# PART 5: THINGS YOU HAVEN'T ASKED ABOUT BUT SHOULD

## 5.1 — Legal & Compliance Research Prompts

```
RESEARCH NEEDED:

356. "Comprehensive COPPA compliance checklist for educational apps 
targeting children under 13 — every requirement, with implementation 
guidance for a Next.js + Supabase app"

357. "GDPR-K (children's data protection) requirements for marketing 
an educational app to families in the EU/UK — age verification, parental 
consent, data processing agreements, legitimate interest vs consent"

358. "FTC endorsement guidelines 2026: complete checklist for influencer 
marketing disclosures — by platform (TikTok, Instagram, YouTube, Blog, 
Pinterest), with examples of compliant and non-compliant disclosures"

359. "CalOPPA, CCPA/CPRA, and state-by-state children's privacy laws 
that affect educational app marketing in the United States"

360. "Advertising to children regulations by country: US (COPPA/FTC), 
UK (ASA/CAP Code), EU (AVMSD), Australia (AANA), Canada (Ad Standards), 
Mexico, Spain, Colombia — complete comparison"

361. "Apple App Store Review Guidelines for kids' apps: complete checklist 
including ads restrictions, data collection limits, 'Made for Kids' 
category requirements, and privacy nutrition labels"

362. "Google Play Families Policy: complete compliance checklist for 
publishing an educational app in the 'Family' section, Teacher Approved 
program requirements, Designed for Families DFF program"

363. "Terms of service and privacy policy templates for a children's 
educational app — legally reviewed language for US, UK, and LATAM markets"

364. "Influencer contract template for children's education brand: 
usage rights, FTC compliance, content approval process, exclusivity, 
payment terms, content ownership, morality clause, COPPA considerations"

365. "Trademark search and brand protection strategy for 'Koydo' — 
domain names to secure, social handles to claim, trademark classes to 
file in, international trademark considerations (Madrid Protocol)"
```

## 5.2 — Analytics, Attribution & Measurement Prompts

```
366. "Complete mobile attribution setup guide for an educational app: 
comparing Adjust, AppsFlyer, Branch, Kochava, and Singular — features, 
pricing, integration complexity with Next.js/Capacitor hybrid app, 
which is best for a startup on a budget"

367. "Multi-touch attribution model for EdTech: how to track the user 
journey from TikTok video → website visit → app install → free account → 
paid conversion, accounting for the long consideration cycle parents have"

368. "UTM parameter strategy and naming conventions for all marketing 
channels: influencer campaigns, paid ads, social organic, email, PR, 
referral — with Google Analytics 4 setup instructions"

369. "Cohort analysis framework for a freemium educational app: which 
cohorts to track (acquisition source, child age, geography, device), 
what metrics per cohort, expected benchmarks for education apps"

370. "Building a marketing dashboard in Google Data Studio / Looker Studio: 
data sources (GA4, Mixpanel, social media APIs, ad platforms), key 
visualizations, automated reporting, stakeholder views"
```

## 5.3 — Retention, Engagement & Growth Prompts

```
371. "Push notification strategy for a children's educational app: 
notification types, frequency, timing by time zone, personalization, 
COPPA compliance for notifications, parent vs. child notifications"

372. "In-app referral program design: mechanics, rewards, viral loops, 
K-factor optimization, examples from successful educational apps"

373. "Gamification system for parent engagement: how to keep PARENTS 
coming back (not just kids) — progress reports, achievements, social 
comparison, community features"

374. "Reducing churn in educational subscriptions: common churn triggers, 
win-back campaigns, pause instead of cancel, downsell sequences, 
seasonal patterns in education app subscriptions"

375. "App Store review acquisition strategy: when to trigger review 
prompts, optimal timing (after achievement, after X sessions), how to 
respond to negative reviews, review velocity impact on ASO"

376. "Onboarding flow optimization for a freemium education app: 
reducing time-to-value, personalization by child age, parent setup vs. 
child first-use, progressive feature disclosure"

377. "Seasonal engagement campaigns for an education app: monthly themes, 
challenges, streaks, limited-time content, holiday specials — full 
12-month calendar with specific campaign briefs"

378. "Network effects and community features to add to an education app: 
parent forums, class groups, leaderboards (ethical considerations with 
children), collaborative learning, teacher communities"
```

## 5.4 — Monetization & Revenue Optimization Prompts

```
379. "Paywall optimization for a freemium children's education app: 
hard vs. soft paywall, feature gating strategy, A/B test framework, 
price sensitivity analysis, when and where to show upgrade prompts"

380. "RevenueCat vs. Adapty vs. Superwall: comparison for managing 
in-app subscriptions, paywall A/B testing, analytics, and pricing 
experiments for an educational app"

381. "Price localization strategy: how to set different prices for 
different countries (US, UK, Mexico, India, Philippines, Nigeria), 
using purchasing power parity, App Store/Google Play price tiers, 
expected conversion rate impact"

382. "B2B sales playbook for selling to school districts: sales cycle 
timeline, decision makers, procurement process, pilot program structure, 
pricing for volume deals, RFP response template"

383. "Grant funding for educational technology startups: federal grants 
(SBIR, STTR, IES, NSF), foundation grants (Gates, Walton, Chan 
Zuckerberg), application timelines, requirements, typical award sizes"

384. "Affiliate marketing program design: commission structure, cookie 
duration, creative assets to provide affiliates, affiliate recruitment, 
education blogger affiliate networks to join"
```

## 5.5 — Competitive Intelligence Prompts

```
385. "Deep competitive analysis of Khan Academy Kids: features, pricing, 
user reviews (analyze recent 1-star and 5-star), app store rankings, 
estimated downloads, marketing strategy observed, content breadth, 
any gaps Koydo can exploit"

386. "Deep competitive analysis of ABCmouse (Age of Learning): full 
feature comparison, pricing strategy, marketing spend estimates, 
celebrity endorsements, school partnerships, FTC issues history"

387. "Deep competitive analysis of Homer (by Begin): acquisition by 
Begin, pricing, content approach, marketing channels, user sentiment"

388. "Deep competitive analysis of Epic! (now part of Byju's): library 
approach vs. curriculum approach, teacher adoption, school features"

389. "Deep competitive analysis of Duolingo (and Duolingo ABC): their 
growth playbook, gamification mechanics, viral loops, streak psychology, 
influencer strategy, what Koydo can learn and adapt"

390. "Deep competitive analysis of Prodigy Math: freemium model details, 
school adoption strategy, parent vs. child monetization, game mechanics"

391. "Education app market landscape 2026: total addressable market 
(TAM), serviceable addressable market (SAM), growth rates by segment 
(K-5, 6-8, 9-12, homeschool), major acquisitions, funding trends, 
emerging competitors, market gaps"

392. "App Store intelligence for education category: top 100 education 
apps by downloads, by revenue, keyword difficulty for target terms, 
seasonal download patterns, average ratings by subcategory"
```

## 5.6 — Localization & International Marketing Prompts

```
393. "Complete localization strategy for launching an educational app 
in Spanish-speaking markets: linguistic variations (Mexico vs. Spain vs. 
Colombia vs. Argentina), cultural considerations, marketing messaging 
adaptations, pricing adjustments, payment methods, influencer markets"

394. "India market entry strategy for an English-language educational app: 
market size, competition (BYJU'S, Unacademy, Vedantu), pricing 
expectations (extreme price sensitivity), distribution channels, payment 
infrastructure, influencer landscape, cultural considerations"

395. "UK and Australia market strategy: regional terminology differences 
(maths vs. math, curriculum alignment), education system differences, 
key marketing channels, influencer landscape, pricing adjustments, 
app store presence"

396. "Philippines and Southeast Asia strategy: English proficiency, 
education system, digital payment landscape, social media usage patterns, 
influencer ecosystem, pricing considerations"

397. "Nigeria and South Africa strategy: market potential, education 
gaps, mobile-first considerations, payment infrastructure, data cost 
sensitivity, community engagement approaches"

398. "App store localization checklist: screenshots by language, 
keyword research by country, description translation and transcreation, 
review response in local languages, cultural visual adaptation"
```

## 5.7 — PR, Media & Thought Leadership Prompts

```
399. "100-word founder bio for press releases, conference bios, and 
LinkedIn — positioning as an educational technology innovator and 
parent-advocate"

400. "Press release template: Koydo launch announcement — for education 
media, tech media, and parenting media (3 versions with different angles)"

401. "Media pitch templates (3 versions): for EdTech journalists, 
parenting editors, and local news education reporters"

402. "Op-ed / thought leadership article topics for the founder to 
publish on LinkedIn, Medium, and pitch to publications:
- The case for free education technology
- AI companions are not replacing teachers — here's what they're doing
- Screen time guilt is costing our children their education
- Why I built a K-12 platform when everyone said to niche down
- The homeschool revolution needs better tools
- What COPPA gets right and wrong about children's digital lives"

403. "Podcast pitch: 50 podcasts in the parenting, education, EdTech, 
and startup space that accept guest pitches — with show name, host, 
email, episode count, listener estimate, and a customized pitch angle 
for each"

404. "Award submission narratives: 500-word impact stories for 
education award applications, emphasizing innovation, accessibility, 
and learning outcomes"
```

## 5.8 — Community Building & User-Generated Content Prompts

```
405. "UGC campaign brief: '#MyKoydoMoment' — encourage parents to share 
their child's learning moments. Campaign mechanics, rules, prizes, 
content rights, platform-specific execution, FTC/COPPA compliance, 
moderation plan"

406. "Ambassador program design for Koydo Parent Champions: application 
process, selection criteria, tiers, rewards, responsibilities, exclusive 
benefits, community management, quarterly meetups, content expectations"

407. "Teacher Ambassador program: free full access, exclusive beta 
features, input on product roadmap, professional development credits, 
social sharing expectations, conference speaker opportunities"

408. "Online community strategy: platform comparison (Discord vs. 
Facebook Group vs. Circle vs. Mighty Networks vs. Slack), moderation 
plan, content calendar, engagement mechanics, growth strategy, 
launch sequence"

409. "Koydo Learning Blog editorial calendar: 52 weeks of content 
topics mapped to SEO opportunities, seasonal moments, product launches, 
and community themes — with title, target keyword, content type, 
and promotion plan for each"

410. "Student spotlight program: how to (ethically, with parental 
consent) feature student achievements and stories for marketing — 
consent forms, privacy protection, storytelling guidelines, 
distribution channels"
```

## 5.9 — Technical Marketing Infrastructure Prompts

```
411. "Marketing tech stack audit and recommendations for an EdTech 
startup: CRM, email marketing, social scheduling, analytics, 
attribution, A/B testing, landing pages, chatbot, helpdesk — 
prioritized by launch importance, with free/startup tier options"

412. "Landing page architecture: how many pages Koydo needs at launch 
(home, features, pricing, about, blog, for-parents, for-teachers, 
for-schools, for-homeschool) — wireframe descriptions, key messaging 
per page, conversion optimization, SEO structure"

413. "Conversion rate optimization (CRO) playbook: website signup flow, 
form fields to include/exclude, social proof placement, urgency tactics 
(ethical ones), trust signals for parents, A/B test roadmap"

414. "Marketing automation workflows to build: welcome series, 
nurture sequences by persona (parent, teacher, homeschool, school admin), 
re-engagement flows, upgrade prompts, referral triggers, milestone 
celebrations, churn prevention — with trigger logic and email copy briefs"

415. "SEO technical audit checklist: site speed for Google rankings, 
schema markup for education content, Open Graph tags for social sharing, 
sitemap optimization, internal linking strategy, Core Web Vitals 
optimization specific to Next.js"
```

## 5.10 — Financial Planning & Unit Economics Prompts

```
416. "Customer acquisition cost (CAC) model for a freemium education app: 
build a spreadsheet model with inputs for each channel (organic social, 
paid social, influencer, ASO, PR, referral), conversion rates at each 
funnel stage, blended CAC target, LTV:CAC ratio benchmarks for EdTech"

417. "Marketing budget allocation model: given $X total monthly budget, 
how to split between channels — with scenario planning for $500, $1000, 
$2500, $5000, $10000 monthly budgets, expected output per channel"

418. "Revenue projection model incorporating marketing spend: 
install volume by channel → free signup rate → free-to-paid conversion 
→ average revenue per user (ARPU) → monthly recurring revenue (MRR) → 
payback period per channel"

419. "Fundraising deck marketing section: how to present marketing 
metrics, growth trajectory, unit economics, and go-to-market strategy 
to angel investors and VCs for a pre-revenue EdTech startup"

420. "Pitch to VC: EdTech market sizing for Koydo — TAM/SAM/SOM 
calculation with sources, growth rate, competitive positioning, 
defensibility arguments"
```

---

# PART 6: RESEARCH INFRASTRUCTURE PROMPTS

## 6.1 — Web Scraping & Data Collection

```
TASK: Build automated research systems for ongoing marketing intelligence.

421. "Python script to scrape and monitor competitor app store listings 
(Khan Academy Kids, ABCmouse, Homer, Epic!, Duolingo) daily — track 
rating changes, review volume, screenshot updates, description changes, 
keyword ranking shifts"

422. "Python script to monitor competitor social media accounts — 
track follower growth, posting frequency, engagement rates, top 
performing content, hashtag usage, sponsorship disclosures"

423. "Google Alerts setup list: 50 search queries to monitor for 
brand mentions, competitor news, industry trends, and partnership 
opportunities in the EdTech space"

424. "Social listening setup: keywords and hashtags to monitor across 
all platforms for mentions of Koydo, competitors, education apps, 
homeschool tools, parenting tech — using free tools (TweetDeck, 
Google Alerts) and paid tools (Brandwatch, Mention, Hootsuite)"

425. "Quarterly competitive intelligence report template: what to 
track, where to find data, how to analyze and present findings, 
action items format"
```

## 6.2 — Ongoing Research Cadence

```
426. "Monthly marketing research tasks to perform:
□ App store keyword ranking check
□ Competitor screenshot/listing audit
□ Influencer landscape scan (new creators in our niche)
□ Social media trend audit (new hashtags, formats, sounds)
□ Community sentiment analysis (Reddit, Facebook Groups mentions)
□ Ad creative inspiration sweep (screen-record competitor ads)
□ Pricing comparison update
□ Review analysis (our reviews + competitor reviews)
□ Content performance audit (which blog posts, social posts performed)
□ Referral program performance review"

427. "Quarterly strategy review framework:
□ Channel performance ranking (CAC by channel)
□ Budget reallocation recommendations
□ New channel evaluation
□ Influencer partnership ROI analysis
□ Content strategy adjustment
□ Competitive landscape update
□ Market trend analysis
□ Goal setting for next quarter"
```

---

# PART 7: COMPREHENSIVE RESOURCE LISTS

## 7.1 — Free Marketing Tools Every Startup Needs

```
TASK: Research and compile every free marketing tool available in 2026.

CATEGORIES:
428. Design: Canva Free, Figma Free, Remove.bg, Unsplash, Pexels, 
     Pixabay, unDraw, Heroicons, Google Fonts — find 30+ more
429. Video: CapCut, DaVinci Resolve, Clipchamp, Loom Free, OBS Studio, 
     Descript Free — find 20+ more
430. Social Media: Buffer Free, Later Free, TweetDeck, Creator Studio, 
     Hootsuite Free — find 15+ more
431. SEO: Google Search Console, Ubersuggest Free, AnswerThePublic Free,
     Google Trends, Ahrefs Free Tools, MozBar — find 20+ more
432. Email: Mailchimp Free, MailerLite Free, Brevo (Sendinblue) Free,
     Buttondown Free — find 10+ more
433. Analytics: Google Analytics 4, Mixpanel Free, Amplitude Free, 
     Plausible, Fathom Lite, Hotjar Free — find 15+ more
434. Landing Pages: Carrd, Google Sites, Notion Web, Framer Free,
     Systeme.io Free — find 10+ more
435. Link Management: Bitly Free, Rebrandly Free, Short.io Free,
     UTM.io — find 5+ more
436. AI Writing: ChatGPT Free, Claude Free, Gemini Free, Copy.ai Free, 
     Writesonic Free — find 10+ more
437. Stock Media: Mixkit (video), Artlist (with trial), Epidemic Sound 
     (with trial), Pixabay Audio, BBC Sound Effects — find 15+ more
438. Project Management: Notion Free, Trello Free, Linear Free, 
     Asana Free — find 10+ more
```

## 7.2 — Hashtag Repository

```
TASK: Compile a master hashtag database organized by:

439. Platform (TikTok, Instagram, YouTube, Pinterest, X/Twitter)
440. Category (parenting, education, homeschool, teachers, EdTech, 
     bilingual, special needs, by age group)
441. Volume tier (mega 1B+, large 100M+, medium 10M+, niche 1M+, 
     micro 100K+)
442. Language (English, Spanish, Portuguese, Hindi, etc.)

For each hashtag: exact tag, platform, estimated volume/views, 
competition level, relevance to Koydo (1-5), recommended frequency of use

TARGET: 500+ hashtags across all categories and platforms
```

## 7.3 — Educational & Marketing Podcasts for Guest Pitching

```
443. TASK: Compile 100 podcasts to pitch for guest appearances.

CATEGORIES:
A) EdTech & Education (30 podcasts):
   Search: "edtech podcast", "education technology podcast", 
   "future of learning podcast"

B) Parenting (30 podcasts):
   Search: "parenting podcast", "mom podcast", "parents and technology"

C) Homeschool (15 podcasts):
   Search: "homeschool podcast", "homeschooling podcast"

D) Startup & Entrepreneurship (15 podcasts):
   Search: "startup podcast with education focus", "founder stories"

E) Teacher / Educator (10 podcasts):
   Search: "teacher podcast", "educator podcast"

For each: Show name, host, email/submission link, episode count, 
estimated listeners, Apple Podcasts rating, relevant episodes to 
reference in pitch, custom pitch angle for Koydo
```

## 7.4 — Domain, Handle & Brand Asset Checklist

```
444. TASK: Check availability and compile registration list for ALL 
brand assets Koydo should secure:

DOMAINS:
- koydo.com, koydo.org, koydo.net, koydo.co, koydo.io, koydo.app
- koydo.edu (if eligible), koydo.school
- koydoapp.com, getkoydo.com, learnkoydo.com, trykoydo.com
- koydo.com.mx, koydo.co.uk, koydo.com.au, koydo.ca, koydo.in
- koydolearning.com, koydoeducation.com
- Typo/defensive: koydo.com misspellings (koido, koyda, koydoo, etc.)

SOCIAL HANDLES (on every platform from Section 2.1):
- @koydo, @koydoapp, @koydolearning, @learnkoydo, @koydoedu
- Check availability on: TikTok, Instagram, YouTube, X/Twitter, 
  Facebook Page, Pinterest, LinkedIn, Threads, Bluesky, Snapchat, 
  Discord, Reddit, GitHub, Medium, Substack, ProductHunt

MARKETPLACE LISTINGS:
- Google Play developer account: "Koydo" or "Koydo Education"
- Apple Developer: Organization name
- Amazon Appstore listing
- Samsung Galaxy Store listing
- Huawei AppGallery listing (for non-Google markets)
- Microsoft Store listing (future)
- Product Hunt: ship page
- AngelList / Wellfound: company profile
- Crunchbase: company profile
- LinkedIn: company page

TRADEMARK:
- US Patent & Trademark Office (USPTO) classes to file
- International classes via Madrid Protocol
- Countries to prioritize for filing
```

---

# HOW TO USE THIS DOCUMENT

## Execution Priority

### Week 1 (Immediate — Before Launch):
1. Run prompts 321-330 (logo/icon generation)
2. Run prompts 337-347 (visual templates)
3. Run prompts 444 (secure domains/handles)
4. Run prompts 1-10 from Section 3.1 (first TikTok/Reels scripts)
5. Run prompt 191-195 (welcome email series)

### Week 2-3 (Pre-Launch Build):
6. Run prompts 1.1 and 1.2 (influencer discovery — start with US market)
7. Run prompts 136-140 (pillar blog content)
8. Run prompts 201-210 (first ad creative)
9. Run prompts 301-305 (print materials)
10. Run prompts 356-365 (legal compliance)

### Week 4-8 (Launch & Scale):
11. Run remaining influencer research prompts
12. Run social media platform mapping (2.1)
13. Run community/forum research (2.2)
14. Run competitive intelligence (5.5)
15. Run analytics setup (5.2)

### Ongoing (Monthly):
16. Run prompts 426-427 (monthly/quarterly research cadence)
17. Generate fresh content from Section 3 prompts
18. Update influencer lists quarterly
19. Monitor competitive landscape

## Agent Configuration Tips

When feeding these prompts to AI agents:
- **Web-search-enabled agents** (Perplexity, ChatGPT with browsing, Claude with web): Best for Parts 1, 2, and 5 (real data gathering)
- **Creative AI** (Claude, GPT-4): Best for Parts 3 and 4 (content and creative generation)
- **Image AI** (Midjourney, DALL·E, Ideogram): Best for Part 4 logo/visual prompts
- **Structured data agents**: Best for compiling lists in CSV/spreadsheet format
- Always include the PRODUCT CONTEXT block at the top when using any prompt
- For multi-part prompts, break into individual requests if the agent struggles with length
- Cross-reference results between agents for accuracy
- Verify influencer data (follower counts change, accounts get deleted)

---

*This document contains 444+ research prompts and directives. Estimated total research time if executed manually: 200-400 hours. With AI agents: 40-80 hours across multiple sessions.*

