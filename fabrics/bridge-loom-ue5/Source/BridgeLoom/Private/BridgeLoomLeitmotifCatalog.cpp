// Copyright Koydo. All Rights Reserved.
// BridgeLoomLeitmotifCatalog.cpp

#include "BridgeLoomLeitmotifCatalog.h"
#include "Engine/StreamableManager.h"
#include "Engine/AssetManager.h"
#include "Kismet/GameplayStatics.h"
#include "Components/AudioComponent.h"

UBridgeLoomLeitmotifCatalog::UBridgeLoomLeitmotifCatalog()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomLeitmotifCatalog::BeginPlay()
{
    Super::BeginPlay();
    if (Leitmotifs.IsEmpty()) InitDefaultLeitmotifs();
}

void UBridgeLoomLeitmotifCatalog::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    StopAllMotifs();
    Super::EndPlay(EndPlayReason);
}

// ─── Public API ───────────────────────────────────────────────────

void UBridgeLoomLeitmotifCatalog::PlayMotif(const FString& CharacterId)
{
    FLoomLeitmotifDefinition Def;
    if (!GetLeitmotifByCharacterId(CharacterId, Def)) return;

    // Already playing — restart from the beginning
    StopMotif(CharacterId);

    if (Def.MotifSound.IsNull())
    {
        // No sound asset assigned — fire the delegate so UI can respond
        OnLeitmotifStarted.Broadcast(CharacterId, Def.CharacterName);
        return;
    }

    TWeakObjectPtr<UBridgeLoomLeitmotifCatalog> WeakThis(this);
    const FString CapturedId   = CharacterId;
    const FString CapturedName = Def.CharacterName;
    const float   CapturedVol  = GlobalMotifVolume;

    FStreamableManager& SM = UAssetManager::GetStreamableManager();
    SM.RequestAsyncLoad(Def.MotifSound.ToSoftObjectPath(),
        FStreamableDelegate::CreateLambda([WeakThis, CapturedId, CapturedName, CapturedVol]()
        {
            if (!WeakThis.IsValid()) return;
            UBridgeLoomLeitmotifCatalog* Self = WeakThis.Get();

            FLoomLeitmotifDefinition LoadedDef;
            if (!Self->GetLeitmotifByCharacterId(CapturedId, LoadedDef)) return;

            USoundBase* Sound = LoadedDef.MotifSound.Get();
            if (!Sound) return;

            UWorld* World = Self->GetWorld();
            if (!World) return;

            UAudioComponent* AC = UGameplayStatics::SpawnSound2D(
                World, Sound, CapturedVol, /*Pitch=*/1.0f, /*StartTime=*/0.0f,
                /*ConcurrencySettings=*/nullptr, /*bPersistAcrossLevelTransition=*/false,
                /*bAutoDestroy=*/true);

            if (AC)
            {
                Self->ActiveMotifs.Add(CapturedId, AC);
            }

            Self->OnLeitmotifStarted.Broadcast(CapturedId, CapturedName);
        }));
}

void UBridgeLoomLeitmotifCatalog::PlayCompassMotif(const FString& Mode)
{
    for (const FLoomCompassMotifMode& CM : CompassMotifModes)
    {
        if (CM.Mode == Mode)
        {
            StopMotif(TEXT("compass"));

            if (CM.MotifSound.IsNull())
            {
                OnLeitmotifStarted.Broadcast(TEXT("compass"), TEXT("Compass:" + Mode));
                return;
            }

            TWeakObjectPtr<UBridgeLoomLeitmotifCatalog> WeakThis(this);
            const FString CapturedMode = Mode;
            const float   CapturedVol  = GlobalMotifVolume;
            FSoftObjectPath SoundPath  = CM.MotifSound.ToSoftObjectPath();

            FStreamableManager& SM = UAssetManager::GetStreamableManager();
            SM.RequestAsyncLoad(SoundPath,
                FStreamableDelegate::CreateLambda([WeakThis, CapturedMode, CapturedVol, SoundPath]()
                {
                    if (!WeakThis.IsValid()) return;
                    UBridgeLoomLeitmotifCatalog* Self = WeakThis.Get();

                    USoundBase* Sound = Cast<USoundBase>(SoundPath.ResolveObject());
                    if (!Sound) return;

                    UWorld* World = Self->GetWorld();
                    if (!World) return;

                    UAudioComponent* AC = UGameplayStatics::SpawnSound2D(
                        World, Sound, CapturedVol, 1.0f, 0.0f,
                        nullptr, false, true);

                    if (AC)
                    {
                        Self->ActiveMotifs.Add(TEXT("compass"), AC);
                    }

                    Self->OnLeitmotifStarted.Broadcast(TEXT("compass"), TEXT("Compass:" + CapturedMode));
                }));
            return;
        }
    }
}

void UBridgeLoomLeitmotifCatalog::StopMotif(const FString& CharacterId)
{
    TWeakObjectPtr<UAudioComponent>* Found = ActiveMotifs.Find(CharacterId);
    if (Found && Found->IsValid())
    {
        (*Found)->Stop();
    }
    ActiveMotifs.Remove(CharacterId);
    OnLeitmotifStopped.Broadcast(CharacterId);
}

void UBridgeLoomLeitmotifCatalog::StopAllMotifs()
{
    for (auto& Pair : ActiveMotifs)
    {
        if (Pair.Value.IsValid())
        {
            Pair.Value->Stop();
        }
    }
    ActiveMotifs.Empty();
}

bool UBridgeLoomLeitmotifCatalog::GetLeitmotifByCharacterId(const FString& CharacterId,
    FLoomLeitmotifDefinition& OutDef) const
{
    for (const FLoomLeitmotifDefinition& D : Leitmotifs)
    {
        if (D.CharacterId == CharacterId) { OutDef = D; return true; }
    }
    return false;
}

bool UBridgeLoomLeitmotifCatalog::IsMotifPlaying(const FString& CharacterId) const
{
    const TWeakObjectPtr<UAudioComponent>* Found = ActiveMotifs.Find(CharacterId);
    if (!Found || !Found->IsValid()) return false;
    return (*Found)->IsPlaying();
}

// ─── Default data ────────────────────────────────────────────────

void UBridgeLoomLeitmotifCatalog::InitDefaultLeitmotifs()
{
    auto Add = [&](const FString& Id, const FString& Name,
                   const FString& Key, const FString& Tempo,
                   const FString& Instrument, const FString& Mood)
    {
        FLoomLeitmotifDefinition D;
        D.CharacterId   = Id; D.CharacterName = Name;
        D.MusicalKey    = Key; D.Tempo        = Tempo;
        D.LeadInstrument = Instrument; D.Mood = Mood;
        // MotifSound left null — Blueprint or DataTable assigns real asset
        Leitmotifs.Add(D);
    };

    // ── Core guides ──────────────────────────────────────────
    Add(TEXT("professor-nimbus"),    TEXT("Professor Nimbus"),     TEXT("D major"),  TEXT("Andante"),    TEXT("Oboe"),                        TEXT("Wise, warm, slightly absent-minded"));
    Add(TEXT("zara-ngozi"),          TEXT("Zara Ngozi"),           TEXT("G minor"),  TEXT("Allegro"),    TEXT("Kalimba"),                     TEXT("Energetic, curious, playful"));
    Add(TEXT("suki-tanaka-reyes"),   TEXT("Suki Tanaka-Reyes"),    TEXT("Eb major"), TEXT("Adagio"),     TEXT("Shakuhachi"),                  TEXT("Calm, reflective, gentle"));
    Add(TEXT("baxter"),              TEXT("Baxter"),               TEXT("Bb major"), TEXT("Moderato"),   TEXT("Cello pizzicato"),             TEXT("Loyal, steady, warm"));
    Add(TEXT("riku-osei"),           TEXT("Riku Osei"),            TEXT("F# minor"), TEXT("Largo"),      TEXT("Kora"),                        TEXT("Mysterious, slightly melancholy, deep"));
    Add(TEXT("dottie-chakravarti"),  TEXT("Dottie Chakravarti"),   TEXT("C major"),  TEXT("Allegretto"), TEXT("Sitar and music box"),         TEXT("Cheerful, inventive, whimsical"));
    Add(TEXT("cal"),                 TEXT("Cal"),                  TEXT("A major"),  TEXT("Rubato"),     TEXT("Glass harmonica"),             TEXT("Dreamy, sensitive, otherworldly"));
    Add(TEXT("lena-sundstrom"),      TEXT("Lena Sundstrom"),       TEXT("E minor"),  TEXT("Vivace"),     TEXT("French horn"),                 TEXT("Bold, heroic, determined"));
    Add(TEXT("kofi-amponsah"),       TEXT("Kofi Amponsah"),        TEXT("D minor"),  TEXT("Moderato"),   TEXT("Highlife guitar"),             TEXT("Rhythmic, grounded, community-focused"));
    Add(TEXT("pixel"),               TEXT("Pixel"),                TEXT("C minor to C major"), TEXT("Irregular"), TEXT("8-bit chiptune with piano"), TEXT("Glitchy, surprisingly emotional"));

    // ── World-specific guides ─────────────────────────────────
    Add(TEXT("echo"),                TEXT("Echo"),                 TEXT("A minor"),  TEXT("Andante"),    TEXT("Handpan drum"),                TEXT("Echoing, introspective, exploratory"));
    Add(TEXT("terra"),               TEXT("Terra"),                TEXT("F major"),  TEXT("Allegro"),    TEXT("Acoustic guitar"),             TEXT("Earthy, warm, adventurous"));
    Add(TEXT("nova"),                TEXT("Nova"),                 TEXT("B major"),  TEXT("Presto"),     TEXT("Electric violin"),             TEXT("Brilliant, fast-thinking, scientific"));
    Add(TEXT("sage"),                TEXT("Sage"),                 TEXT("G major"),  TEXT("Largo"),      TEXT("Cello"),                       TEXT("Patient, ancient, wise"));
    Add(TEXT("wren"),                TEXT("Wren"),                 TEXT("E major"),  TEXT("Allegretto"), TEXT("Flute"),                       TEXT("Light, quick, observant"));
    Add(TEXT("finn"),                TEXT("Finn"),                 TEXT("C major"),  TEXT("Moderato"),   TEXT("Ukulele"),                     TEXT("Cheerful, practical, unflappable"));
    Add(TEXT("luna"),                TEXT("Luna"),                 TEXT("D major"),  TEXT("Adagio"),     TEXT("Harp"),                        TEXT("Luminous, gentle, far-sighted"));
    Add(TEXT("max"),                 TEXT("Max"),                  TEXT("A major"),  TEXT("Allegro"),    TEXT("Trumpet"),                     TEXT("Confident, bold, can-do"));
    Add(TEXT("mira"),                TEXT("Mira"),                 TEXT("F# minor"), TEXT("Andante"),    TEXT("Clarinet"),                    TEXT("Inquisitive, careful, methodical"));
    Add(TEXT("otto"),                TEXT("Otto"),                 TEXT("Bb major"), TEXT("Allegretto"), TEXT("Accordion"),                   TEXT("Jovial, slightly clumsy, big-hearted"));

    // ── Historical and specialized ────────────────────────────
    Add(TEXT("aria"),                TEXT("Aria"),                 TEXT("E minor"),  TEXT("Adagio"),     TEXT("Voice (wordless)"),            TEXT("Haunting, expressive, timeless"));
    Add(TEXT("jasper"),              TEXT("Jasper"),               TEXT("G major"),  TEXT("Moderato"),   TEXT("Banjo"),                       TEXT("Folksy, street-smart, resourceful"));
    Add(TEXT("cleo"),                TEXT("Cleo"),                 TEXT("C# minor"), TEXT("Allegro"),    TEXT("Electric guitar"),             TEXT("Sharp, focused, rule-bending"));
    Add(TEXT("orion"),               TEXT("Orion"),                TEXT("B minor"),  TEXT("Largo"),      TEXT("Contrabass"),                  TEXT("Deep, navigational, ancient"));
    Add(TEXT("felix"),               TEXT("Felix"),                TEXT("D major"),  TEXT("Vivace"),     TEXT("Violin"),                      TEXT("Pure delight, mischievous"));
    Add(TEXT("nia"),                 TEXT("Nia"),                  TEXT("F major"),  TEXT("Moderato"),   TEXT("Steel pan"),                   TEXT("Community-minded, rhythmic, warm"));
    Add(TEXT("arlo"),                TEXT("Arlo"),                 TEXT("G minor"),  TEXT("Allegretto"), TEXT("Acoustic bass"),               TEXT("Grounded, dry humor, observational"));
    Add(TEXT("thea"),                TEXT("Thea"),                 TEXT("A major"),  TEXT("Andante"),    TEXT("Marimba"),                     TEXT("Sunlit, optimistic, precise"));
    Add(TEXT("indigo"),              TEXT("Indigo"),               TEXT("Bb minor"), TEXT("Adagio"),     TEXT("Dulcimer"),                    TEXT("Ethereal, between-worlds, contemplative"));
    Add(TEXT("sam"),                 TEXT("Sam"),                  TEXT("C major"),  TEXT("Allegro"),    TEXT("Drums"),                       TEXT("Energetic, beats-first, improvisational"));

    // ── Knowledge domain specialists ──────────────────────────
    Add(TEXT("atlas"),               TEXT("Atlas"),                TEXT("E major"),  TEXT("Moderato"),   TEXT("Mandolin"),                    TEXT("Traveled, map-oriented, curious about place"));
    Add(TEXT("lyric"),               TEXT("Lyric"),                TEXT("D minor"),  TEXT("Adagio"),     TEXT("Cello and voice"),             TEXT("Poetic, sensitive to language, slow burning"));
    Add(TEXT("vera"),                TEXT("Vera"),                 TEXT("F major"),  TEXT("Allegro"),    TEXT("Oboe d'amore"),                TEXT("Precise, truth-seeking, meticulous"));
    Add(TEXT("cosmo"),               TEXT("Cosmo"),                TEXT("F# major"), TEXT("Presto"),     TEXT("Synth + orchestral"),          TEXT("Cosmic scale thinker, layered, vast"));
    Add(TEXT("cedar"),               TEXT("Cedar"),                TEXT("C# major"), TEXT("Largo"),      TEXT("Duduk"),                       TEXT("Ancient, slow-growing, deep-rooted"));
    Add(TEXT("river"),               TEXT("River"),                TEXT("G major"),  TEXT("Allegretto"), TEXT("Wooden flute"),                TEXT("Flow-minded, changing, adaptive"));
    Add(TEXT("quint"),               TEXT("Quint"),                TEXT("A minor"),  TEXT("Moderato"),   TEXT("Piano"),                       TEXT("Puzzle-solver, structural, harmonic"));
    Add(TEXT("bex"),                 TEXT("Bex"),                  TEXT("E minor"),  TEXT("Vivace"),     TEXT("Electric bass"),               TEXT("Underground, finding hidden beats, perceptive"));
    Add(TEXT("lark"),                TEXT("Lark"),                 TEXT("D major"),  TEXT("Allegro"),    TEXT("Piccolo"),                     TEXT("High-flying, tiny but mighty, joyful"));
    Add(TEXT("moss"),                TEXT("Moss"),                 TEXT("B major"),  TEXT("Andante"),    TEXT("Hammered dulcimer"),           TEXT("Patient, slow-reveal, quiet insight"));

    // ── Support and system characters ────────────────────────
    Add(TEXT("echo-v2"),             TEXT("Echo (v2)"),            TEXT("Ab major"), TEXT("Moderato"),   TEXT("Singing bowl"),                TEXT("Resonant, returning, deepened understanding"));
    Add(TEXT("grove"),               TEXT("Grove"),                TEXT("F minor"),  TEXT("Largo"),      TEXT("Bass clarinet"),               TEXT("Deep shade, sheltering, generative"));
    Add(TEXT("sparks"),              TEXT("Sparks"),               TEXT("C major"),  TEXT("Presto"),     TEXT("Glockenspiel"),                TEXT("Bright, playful, celebratory"));
    Add(TEXT("drift"),               TEXT("Drift"),                TEXT("G minor"),  TEXT("Adagio"),     TEXT("Theremin"),                    TEXT("Floating, transition-focused, uncertain"));
    Add(TEXT("stone"),               TEXT("Stone"),                TEXT("C minor"),  TEXT("Largo"),      TEXT("Organ"),                       TEXT("Immovable, timeless, structural"));
    Add(TEXT("flicker"),             TEXT("Flicker"),              TEXT("E major"),  TEXT("Allegretto"), TEXT("Harpsichord"),                 TEXT("Quick, flickering insight, playful-anxious"));
    Add(TEXT("wilt"),                TEXT("Wilt"),                 TEXT("D minor"),  TEXT("Adagio"),     TEXT("Oboe (fading)"),               TEXT("Ending, loss, quiet grief — and eventual growth"));
    Add(TEXT("bloom"),               TEXT("Bloom"),                TEXT("G major"),  TEXT("Allegro"),    TEXT("Strings + wind"),              TEXT("New beginning, optimism, earned hope"));
    Add(TEXT("echo-deep"),           TEXT("Echo (Deep)"),          TEXT("A minor"),  TEXT("Largo"),      TEXT("Low cello with reverb"),       TEXT("Ancient echo, layered memory, forgotten journey"));
    Add(TEXT("root"),                TEXT("Root"),                 TEXT("F major"),  TEXT("Moderato"),   TEXT("Bass guitar + tuba"),          TEXT("Foundation, belonging, grounded strength"));

    // ── The Compass (adaptive motif — 4 modes) ────────────────
    FLoomCompassMotifMode Orienting;
    Orienting.Mode = TEXT("orienting");
    CompassMotifModes.Add(Orienting);

    FLoomCompassMotifMode Celebrating;
    Celebrating.Mode = TEXT("celebrating");
    CompassMotifModes.Add(Celebrating);

    FLoomCompassMotifMode Challenge;
    Challenge.Mode = TEXT("challenge");
    CompassMotifModes.Add(Challenge);

    FLoomCompassMotifMode Quiet;
    Quiet.Mode = TEXT("quiet");
    CompassMotifModes.Add(Quiet);
}
