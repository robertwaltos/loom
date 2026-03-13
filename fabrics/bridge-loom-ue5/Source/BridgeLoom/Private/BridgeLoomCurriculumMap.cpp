// Copyright Koydo. All Rights Reserved.
// BridgeLoomCurriculumMap.cpp

#include "BridgeLoomCurriculumMap.h"

UBridgeLoomCurriculumMap::UBridgeLoomCurriculumMap()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomCurriculumMap::BeginPlay()
{
    Super::BeginPlay();

    if (STEMAlignments.IsEmpty())    InitDefaultAlignments();
    if (GradeMappings.IsEmpty())     InitDefaultGradeMappings();
    if (CrossCurricularHighlights.IsEmpty()) InitDefaultCrossHighlights();
}

// ─── Queries ─────────────────────────────────────────────────────

void UBridgeLoomCurriculumMap::GetAlignmentsForWorld(const FString& WorldId,
    TArray<FLoomSTEMAlignment>& OutSTEM,
    TArray<FLoomLanguageArtsAlignment>& OutLA,
    TArray<FLoomFinancialAlignment>& OutFin) const
{
    for (const FLoomSTEMAlignment& A : STEMAlignments)
        if (A.WorldId == WorldId) OutSTEM.Add(A);

    for (const FLoomLanguageArtsAlignment& A : LanguageArtsAlignments)
        if (A.WorldId == WorldId) OutLA.Add(A);

    for (const FLoomFinancialAlignment& A : FinancialAlignments)
        if (A.WorldId == WorldId) OutFin.Add(A);
}

bool UBridgeLoomCurriculumMap::GetSTEMAlignment(const FString& WorldId,
    FLoomSTEMAlignment& OutAlignment) const
{
    for (const FLoomSTEMAlignment& A : STEMAlignments)
    {
        if (A.WorldId == WorldId) { OutAlignment = A; return true; }
    }
    return false;
}

bool UBridgeLoomCurriculumMap::GetLanguageArtsAlignment(const FString& WorldId,
    FLoomLanguageArtsAlignment& OutAlignment) const
{
    for (const FLoomLanguageArtsAlignment& A : LanguageArtsAlignments)
    {
        if (A.WorldId == WorldId) { OutAlignment = A; return true; }
    }
    return false;
}

bool UBridgeLoomCurriculumMap::GetFinancialAlignment(const FString& WorldId,
    FLoomFinancialAlignment& OutAlignment) const
{
    for (const FLoomFinancialAlignment& A : FinancialAlignments)
    {
        if (A.WorldId == WorldId) { OutAlignment = A; return true; }
    }
    return false;
}

TArray<FLoomCrossCurricularHighlight> UBridgeLoomCurriculumMap::GetHighlightsForWorld(
    const FString& WorldId) const
{
    TArray<FLoomCrossCurricularHighlight> Result;
    for (const FLoomCrossCurricularHighlight& H : CrossCurricularHighlights)
        if (H.WorldId == WorldId) Result.Add(H);
    return Result;
}

bool UBridgeLoomCurriculumMap::GetGradeMapping(ELoomAgeLabel AgeLabel,
    FLoomGradeMapping& OutMapping) const
{
    for (const FLoomGradeMapping& M : GradeMappings)
    {
        if (M.AgeLabel == AgeLabel) { OutMapping = M; return true; }
    }
    return false;
}

TArray<FString> UBridgeLoomCurriculumMap::GetWorldsForDomain(
    ELoomCurriculumDomain Domain) const
{
    TArray<FString> Result;
    if (Domain == ELoomCurriculumDomain::STEM)
    {
        for (const FLoomSTEMAlignment& A : STEMAlignments) Result.Add(A.WorldId);
    }
    else if (Domain == ELoomCurriculumDomain::LanguageArts)
    {
        for (const FLoomLanguageArtsAlignment& A : LanguageArtsAlignments) Result.Add(A.WorldId);
    }
    else
    {
        for (const FLoomFinancialAlignment& A : FinancialAlignments) Result.Add(A.WorldId);
    }
    return Result;
}

// ─── Default: STEM (15 worlds) ───────────────────────────────────

void UBridgeLoomCurriculumMap::InitDefaultAlignments()
{
    auto AddSTEM = [&](const FString& WId, const FString& WName,
                       const FString& NGSS, const FString& Sec, const FString& Skills)
    {
        FLoomSTEMAlignment A;
        A.WorldId = WId; A.WorldName = WName;
        A.PrimaryNGSS = NGSS; A.SecondaryStandards = Sec;
        A.SkillsDeveloped = Skills;
        STEMAlignments.Add(A);
    };

    AddSTEM(TEXT("cloud-kingdom"),       TEXT("Cloud Kingdom"),
            TEXT("ESS2.D (Weather & Climate), ESS3.D (Global Climate Change)"),
            TEXT("CCSS.ELA-Literacy.RST.6-8.7"),
            TEXT("Data analysis, pattern recognition, scientific argument"));

    AddSTEM(TEXT("meadow-lab"),          TEXT("Meadow Lab"),
            TEXT("LS1.B (Growth & Development), LS2.A (Interdependent Relationships), LS4.D (Biodiversity)"),
            TEXT("CCSS.ELA-Literacy.RST.3-5.1"),
            TEXT("Experimental design, cause-effect reasoning, environmental literacy"));

    AddSTEM(TEXT("calculation-caves"),   TEXT("Calculation Caves"),
            TEXT("MP.1-8 (Mathematical Practices), 4.NBT, 6.NS, 8.EE"),
            TEXT("CCSS.MATH.6.EE.A"),
            TEXT("Algebraic thinking, number sense, mathematical argumentation"));

    AddSTEM(TEXT("magnet-hills"),        TEXT("Magnet Hills"),
            TEXT("PS2.A (Forces & Motion), PS3.A (Definitions of Energy), ESS1.B (Earth & Solar System)"),
            TEXT("CCSS.ELA-Literacy.RST.6-8.3"),
            TEXT("Quantitative reasoning, model-based explanation, scientific history"));

    AddSTEM(TEXT("starfall-observatory"),TEXT("Starfall Observatory"),
            TEXT("ESS1.A (Universe Scale), ESS1.B, PS2.B (Types of Interactions)"),
            TEXT("CCSS.MATH.8.G"),
            TEXT("Scale and proportion, systems thinking, inference from indirect evidence"));

    AddSTEM(TEXT("circuit-marsh"),       TEXT("Circuit Marsh"),
            TEXT("PS3.B (Conservation of Energy), PS3.D (Energy in Processes), ETS1.A (Engineering Problems)"),
            TEXT("CCSS.ELA-Literacy.RST.6-8.7"),
            TEXT("Engineering design, cost-benefit analysis, social history of technology"));

    AddSTEM(TEXT("code-canyon"),         TEXT("Code Canyon"),
            TEXT("CS K-12 CSTA Standards 2-AP-10 through 2-AP-19"),
            TEXT("CCSS.ELA-Literacy.W.6-8.2"),
            TEXT("Algorithmic thinking, debugging, ethical reasoning in design"));

    AddSTEM(TEXT("body-atlas"),          TEXT("Body Atlas"),
            TEXT("LS1.A (Structure & Function), LS1.B, LS1.D (Information Processing)"),
            TEXT("CCSS.ELA-Literacy.RST.6-8.1"),
            TEXT("Evidence evaluation, historical science literacy, systems biology"));

    AddSTEM(TEXT("frost-peaks"),         TEXT("Frost Peaks"),
            TEXT("ESS1.C (History of Earth), ESS2.A (Earth Materials), ESS2.B (Plate Tectonics)"),
            TEXT("CCSS.ELA-Literacy.RST.6-8.2"),
            TEXT("Time-scale reasoning, stratigraphic interpretation, climate literacy"));

    AddSTEM(TEXT("greenhouse-spiral"),   TEXT("Greenhouse Spiral"),
            TEXT("PS1.A (Structure of Matter), PS1.B (Chemical Reactions)"),
            TEXT("CCSS.ELA-Literacy.RST.6-8.8"),
            TEXT("Chemical reasoning, lab safety, history of scientific error"));

    AddSTEM(TEXT("data-stream"),         TEXT("Data Stream"),
            TEXT("CCSS.MATH.SP (Statistics & Probability), 6.SP.A, 6.SP.B"),
            TEXT("C3 Framework D2.His.5.3-5"),
            TEXT("Data literacy, statistical reasoning, media literacy, source evaluation"));

    AddSTEM(TEXT("map-room"),            TEXT("Map Room"),
            TEXT("CCSS.MATH.6.G, 6.NS.C"),
            TEXT("C3 Framework D2.Geo.1-12"),
            TEXT("Spatial reasoning, projection literacy, geopolitical awareness"));

    AddSTEM(TEXT("number-garden"),       TEXT("Number Garden"),
            TEXT("CCSS.MATH.OA, NBT, G (all grades)"),
            TEXT("CCSS.MATH.MP.1-8"),
            TEXT("Number sense, pattern recognition, algebraic reasoning, proof reasoning"));

    AddSTEM(TEXT("savanna-workshop"),    TEXT("Savanna Workshop"),
            TEXT("ETS1.A, ETS1.B (Developing Solutions), ETS1.C (Optimizing Design)"),
            TEXT("CCSS.ELA-Literacy.W.4.2"),
            TEXT("Engineering design cycle, iterative improvement, material science"));

    AddSTEM(TEXT("tideline-bay"),        TEXT("Tideline Bay"),
            TEXT("LS2.B (Cycles of Matter), LS4.C (Adaptation), ESS3.C (Human Impacts)"),
            TEXT("CCSS.ELA-Literacy.RST.3-5.1"),
            TEXT("Ecological thinking, environmental stewardship, scientific observation"));

    // ── Language Arts (10 worlds) ─────────────────────────────
    auto AddLA = [&](const FString& WId, const FString& WName,
                     const FString& CCSS, const FString& Sec, const FString& Skills)
    {
        FLoomLanguageArtsAlignment A;
        A.WorldId = WId; A.WorldName = WName;
        A.PrimaryCCSS = CCSS; A.SecondaryStandards = Sec;
        A.SkillsDeveloped = Skills;
        LanguageArtsAlignments.Add(A);
    };

    AddLA(TEXT("story-tree"),       TEXT("Story Tree"),
          TEXT("CCSS.ELA-Literacy.RL.3-8 (Key Ideas, Craft & Structure)"),
          TEXT("CCSS.ELA-Literacy.W.3.3"),
          TEXT("Narrative analysis, theme identification, cross-cultural story comparison"));

    AddLA(TEXT("reading-reef"),     TEXT("Reading Reef"),
          TEXT("CCSS.ELA-Literacy.RL.1-5.1-10 (Reading Literature)"),
          TEXT("CCSS.ELA-Literacy.RF.1-5"),
          TEXT("Decoding, comprehension, vocabulary in context, fluency"));

    AddLA(TEXT("rhyme-docks"),      TEXT("Rhyme Docks"),
          TEXT("CCSS.ELA-Literacy.RL.4-6.5 (Craft & Structure: Poetry)"),
          TEXT("CCSS.ELA-Literacy.W.3-5.3"),
          TEXT("Poetic form analysis, oral tradition, figurative language, performance"));

    AddLA(TEXT("letter-forge"),     TEXT("Letter Forge"),
          TEXT("CCSS.ELA-Literacy.L.2-5.2 (Conventions of English)"),
          TEXT("CCSS.ELA-Literacy.RF.1-3"),
          TEXT("Phonics, spelling patterns, language history, etymology"));

    AddLA(TEXT("grammar-bridge"),   TEXT("Grammar Bridge"),
          TEXT("CCSS.ELA-Literacy.L.1-8.1-3 (Language Conventions)"),
          TEXT("CCSS.ELA-Literacy.L.6-8.3"),
          TEXT("Sentence structure, grammatical reasoning, language precision"));

    AddLA(TEXT("debate-arena"),     TEXT("Debate Arena"),
          TEXT("CCSS.ELA-Literacy.SL.6-8.3-4 (Speaking & Listening)"),
          TEXT("CCSS.ELA-Literacy.W.6-8.1"),
          TEXT("Argumentative reasoning, claim-evidence-warrant, civil discourse"));

    AddLA(TEXT("nonfiction-fleet"), TEXT("Nonfiction Fleet"),
          TEXT("CCSS.ELA-Literacy.RI.3-8.1-10 (Reading Informational)"),
          TEXT("CCSS.ELA-Literacy.W.3-8.7"),
          TEXT("Research skills, primary source evaluation, expository writing"));

    AddLA(TEXT("diary-lighthouse"), TEXT("Diary Lighthouse"),
          TEXT("CCSS.ELA-Literacy.W.3-5.3 (Narrative Writing)"),
          TEXT("CCSS.ELA-Literacy.L.3-5.1"),
          TEXT("Personal narrative, voice development, reflective writing"));

    AddLA(TEXT("folklore-bazaar"),  TEXT("Folklore Bazaar"),
          TEXT("CCSS.ELA-Literacy.RL.3-5.9 (Compare Texts)"),
          TEXT("C3.D2.His.1.3-5"),
          TEXT("Cultural literacy, oral tradition analysis, cross-cultural comparison"));

    AddLA(TEXT("vocabulary-jungle"),TEXT("Vocabulary Jungle"),
          TEXT("CCSS.ELA-Literacy.L.3-8.4-6 (Vocabulary Acquisition)"),
          TEXT("CCSS.ELA-Literacy.RL.4.4"),
          TEXT("Word roots, contextual meaning, semantic precision"));

    // ── Financial Literacy (10 worlds) ────────────────────────
    auto AddFin = [&](const FString& WId, const FString& WName,
                      const FString& Stds, const FString& Framework, const FString& Skills)
    {
        FLoomFinancialAlignment A;
        A.WorldId = WId; A.WorldName = WName;
        A.PrimaryStandards = Stds; A.Framework = Framework;
        A.SkillsDeveloped = Skills;
        FinancialAlignments.Add(A);
    };

    AddFin(TEXT("market-square"),           TEXT("Market Square"),
           TEXT("Jump$tart Coalition K-12 Standards - Spending 1-4"),
           TEXT("C3 D2.Eco.1-14"),
           TEXT("Supply/demand, market function, consumer decision-making"));

    AddFin(TEXT("budget-kitchen"),          TEXT("Budget Kitchen"),
           TEXT("Jump$tart Coalition - Spending, Saving 1-4"),
           TEXT("CCSS.MATH.6.RP.A"),
           TEXT("Budget planning, trade-off analysis, needs vs. wants"));

    AddFin(TEXT("investment-greenhouse"),   TEXT("Investment Greenhouse"),
           TEXT("Jump$tart Coalition - Saving & Investing 1-4"),
           TEXT("CCSS.MATH.6.EE"),
           TEXT("Compound interest, risk/reward, long-term thinking"));

    AddFin(TEXT("savings-vault"),           TEXT("Savings Vault"),
           TEXT("Jump$tart Coalition - Saving & Investing 1-3"),
           TEXT("CCSS.MATH.5.NBT"),
           TEXT("Goal-setting, delayed gratification, interest calculation"));

    AddFin(TEXT("entrepreneurs-workshop"),  TEXT("Entrepreneur's Workshop"),
           TEXT("Jump$tart Coalition - Earning 1-4"),
           TEXT("C3 D2.Eco.8-9"),
           TEXT("Business planning, profit/loss, innovation and risk"));

    AddFin(TEXT("debt-glacier"),            TEXT("Debt Glacier"),
           TEXT("Jump$tart Coalition - Borrowing 1-4"),
           TEXT("CCSS.MATH.7.RP"),
           TEXT("Interest rates, compound debt, credit management"));

    AddFin(TEXT("charity-harbor"),          TEXT("Charity Harbor"),
           TEXT("Jump$tart Coalition - Financial Decision Making 1-3"),
           TEXT("C3 D2.Eco.12-14"),
           TEXT("Philanthropy, community investment, civic economics"));

    AddFin(TEXT("tax-office"),              TEXT("Tax Office"),
           TEXT("Jump$tart Coalition - Financial Decision Making 4"),
           TEXT("CCSS.MATH.6.RP"),
           TEXT("Tax system basics, civic responsibility, government revenue"));

    AddFin(TEXT("needs-wants-bridge"),      TEXT("Needs-Wants Bridge"),
           TEXT("Jump$tart Coalition - Spending 1-2"),
           TEXT("CCSS.MATH.1.OA"),
           TEXT("Wants vs. needs, decision making, prioritization"));

    AddFin(TEXT("sharing-meadow"),          TEXT("Sharing Meadow"),
           TEXT("Jump$tart Coalition - Financial Decision Making 1-2"),
           TEXT("C3 D2.Eco.1-3"),
           TEXT("Resource sharing, community contribution, early giving concepts"));
}

// ─── Default: Grade Mappings ─────────────────────────────────────

void UBridgeLoomCurriculumMap::InitDefaultGradeMappings()
{
    auto AddGrade = [&](ELoomAgeLabel Label, const FString& Range,
                        const FString& CC, const FString& NGSS)
    {
        FLoomGradeMapping M;
        M.AgeLabel = Label; M.GradeRange = Range;
        M.CommonCoreBand = CC; M.NgssGradeBand = NGSS;
        GradeMappings.Add(M);
    };

    AddGrade(ELoomAgeLabel::Ages5to7,   TEXT("Kindergarten - Grade 2"), TEXT("K-2"), TEXT("K-2"));
    AddGrade(ELoomAgeLabel::Ages8to10,  TEXT("Grades 3-5"),             TEXT("3-5"), TEXT("3-5"));
    AddGrade(ELoomAgeLabel::Ages11to13, TEXT("Grades 6-8"),             TEXT("6-8"), TEXT("6-8"));
}

// ─── Default: Cross-Curricular Highlights (8) ────────────────────

void UBridgeLoomCurriculumMap::InitDefaultCrossHighlights()
{
    auto AddHL = [&](const FString& Entry, const FString& WId,
                     const FString& STEM, const FString& LA, const FString& SS)
    {
        FLoomCrossCurricularHighlight H;
        H.EntryName = Entry; H.WorldId = WId;
        H.STEMStandard = STEM; H.LanguageArtsStandard = LA;
        H.SocialStudiesStandard = SS;
        CrossCurricularHighlights.Add(H);
    };

    AddHL(TEXT("The Water Cycle"),
          TEXT("cloud-kingdom"),
          TEXT("ESS2.D Weather & Climate"),
          TEXT("CCSS.ELA-Literacy.RI.5.3 Explaining relationships"),
          TEXT("C3 D2.Geo.4 Human-environment interaction"));

    AddHL(TEXT("Fibonacci in Nature"),
          TEXT("number-garden"),
          TEXT("CCSS.MATH.MP.7 Look for structure"),
          TEXT("CCSS.ELA-Literacy.RI.5.8 Reasoning and evidence"),
          TEXT("C3 D2.Geo.1 Spatial patterns"));

    AddHL(TEXT("Harriet Tubman & the Underground Railroad"),
          TEXT("story-tree"),
          TEXT("N/A"),
          TEXT("CCSS.ELA-Literacy.RI.4.3 Connections and sequence"),
          TEXT("C3 D2.His.2 Change and continuity — US Expansion era"));

    AddHL(TEXT("How Coral Reefs Work"),
          TEXT("tideline-bay"),
          TEXT("LS2.C Ecosystem dynamics"),
          TEXT("CCSS.ELA-Literacy.RST.3-5.7 Integrate text and visual"),
          TEXT("C3 D2.Geo.8 Environmental justice"));

    AddHL(TEXT("The Printing Press"),
          TEXT("nonfiction-fleet"),
          TEXT("ETS1.B Designing solutions"),
          TEXT("CCSS.ELA-Literacy.RI.5.6 Author purpose"),
          TEXT("C3 D2.His.1 Historical causation — early modern Europe"));

    AddHL(TEXT("DNA & Identity"),
          TEXT("body-atlas"),
          TEXT("LS1.A Structure & function, LS3.A Inheritance"),
          TEXT("CCSS.ELA-Literacy.RST.6-8.1 Cite textual evidence"),
          TEXT("C3 D2.Psy.1 Individual identity and social context"));

    AddHL(TEXT("Supply and Demand with Weather"),
          TEXT("market-square"),
          TEXT("ESS2.D Severe weather impacts"),
          TEXT("CCSS.ELA-Literacy.RI.5.3 Cause and effect"),
          TEXT("C3 D2.Eco.1 Economic decision-making"));

    AddHL(TEXT("The Math of the Stars"),
          TEXT("starfall-observatory"),
          TEXT("ESS1.A Universe and its stars"),
          TEXT("CCSS.ELA-Literacy.RST.6-8.7 Reading scientific text"),
          TEXT("C3 D2.Geo.2 Spatial perspective — scale and distance"));
}
