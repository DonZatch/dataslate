import { useEffect, useState, useCallback, useMemo, use } from 'react';
import { parse } from 'yaml';
import settingsData from "./data/settings.yaml";
import armyData from "./data/armies.yaml";
import detachmentData from "./data/detachments.yaml";
import unitData from "./data/units.yaml";
import strategemData from "./data/strategems.yaml";
import abilityData from "./data/abilities.yaml";
import './App.css';

function App() {
  const [armies, setArmies] = useState(null);
  const [detachments, setDetachments] = useState(null);
  const [units, setUnits] = useState(null);
  const [coreStrategems, setCoreStrategems] = useState(null);
  const [appSettings, setAppSettings] = useState({});
  const [abilities, setAbilities] = useState([]);
  const [showInfo, setShowInfo] = useState(null);

  const showInfoModal = function (e, ability) {
    e.preventDefault();
    e.stopPropagation();
    setShowInfo(ability);
  };

  // Load all the data
  useEffect(() => {
    expireLocalStorage();
    loadData("settings", settingsData, setAppSettings);
    loadData("armies", armyData, setArmies);
    loadData("detachments", detachmentData, setDetachments);
    loadData("units", unitData, setUnits);
    loadData("strategems", strategemData, setCoreStrategems);
    loadData("abilities", abilityData, setAbilities);
  }, []);

  return (
    <>
      <SVGPatterns />
      <MainContent units={units} armies={armies} detachments={detachments} coreStrategems={coreStrategems} appSettings={appSettings} setShowInfo={showInfoModal} />
      <InfoModal ability={showInfo} abilities={abilities} setShowInfo={showInfoModal} />
    </>
  );
}

function expireLocalStorage()
{
  var lastUpdated = localStorage.getItem("instant");
  if (!lastUpdated)
  {
    return;
  }
  var oneDayInMS = (24 * 60 * 60 * 1000)
  if (Date.now() - lastUpdated > oneDayInMS) {
    localStorage.clear();
  }
}

function loadData(key, dataURL, setValue)
{
  var localData = localStorage.getItem(key);
  if (localData)
  {
    setValue(JSON.parse(localData));
    return;
  }
  fetch(dataURL)
    .then(response => response.text())
    .then(data => parse(data))
    .then(parsed => { 
        localStorage.setItem(key, JSON.stringify(parsed));
        localStorage.setItem("instant", Date.now());
        setValue(parsed);
      });
}

function SVGPatterns() {
  return (
    <svg className="svgPatterns" width="0" height="0">
      <defs>
        <pattern id="d6" width="64" height="64" patternUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="#0c3455" rx="14" ry="14" />
          <circle cx="14" cy="14" r="7" fill="white" />
          <circle cx="14" cy="32" r="7" fill="white" />
          <circle cx="14" cy="50" r="7" fill="white" />
          <circle cx="50" cy="14" r="7" fill="white" />
          <circle cx="50" cy="32" r="7" fill="white" />
          <circle cx="50" cy="50" r="7" fill="white" />
        </pattern>
        <pattern id="plus" width="64" height="64" patternUnits="userSpaceOnUse">
          <circle cx="32" cy="32" r="32" fill="#0c3455" />
          <rect x="28" y="14" width="8" height="36" fill="white" />
          <rect x="28" y="14" width="8" height="36" fill="white" />
          <rect x="14" y="28" width="36" height="8" fill="white" />
          <rect x="14" y="28" width="36" height="8" fill="white" />
        </pattern>
      </defs>
    </svg>
  );
}

function MainContent({ armies, detachments, units, coreStrategems, appSettings, setShowInfo }) {
  var route = parseRoute();
  var [wakeLock, setWakeLock] = useState(null);

  useEffect(() => {
    if (!route)
    {
      wakeLock?.release();
      return;
    }
    if (wakeLock != null)
    {
      return;
    }
    if (!("wakeLock" in navigator))
    {
      return;
    }
    navigator.wakeLock.request().then(wakeLock => setWakeLock(wakeLock));
  }, [route, wakeLock]);

  switch (route.page)
  {
    case "army":
      return (
        <ArmyDetails 
          id={route.army}
          key={route.army} 
          armies={armies}
          detachments={detachments} 
          units={units} 
          coreStrategems={coreStrategems} 
          appSettings={appSettings} 
          setShowInfo={setShowInfo}
        />
      );
    case "unit":
      return (
        <UnitDetails 
          id={route.unit} 
          army={route.army}
          units={units} 
          setShowInfo={setShowInfo}
        />
      )
    default: 
      return (<Home armies={armies} />);
  }
}

function parseRoute()
{
  var queryString = window.location.search;
  var urlParams = new URLSearchParams(queryString);
  if (!urlParams)
  {
    return { page: "", id: "" };
  }

  var army = urlParams.get("army");
  if (army)
  {
    return { page: "army", army: army };
  }

  return { page: "", id: "" };
}

function Home({ armies })
{
  var [view, setView] = useState("armies");

  const handler = useCallback((e, view) => {
    e.preventDefault();
    e.stopPropagation();
    setView(view);
  }, []);

  return (
    <div>
      { view === "armies" ? <ArmyMenu armies={armies} /> : null}
      { view === "scoreboard" ? <Scoreboard /> : null}
      <menu className="homeViews">
        <MenuItem view="armies" label="Armies" handler={handler} currentView={view} />
        <MenuItem view="scoreboard" label="Scoreboard" handler={handler} currentView={view} />
      </menu>
    </div>
  )
}

function MenuItem({ view, label, currentView, handler })
{
  return <li><a href="#" className={currentView === view ? "selected" : undefined} onClick={(e) => handler(e, view)}>{label}</a></li>
}

function ArmyMenu({ armies })
{
  const handler = useCallback(() => {
    localStorage.clear();
    window.location.reload();
  }, []);
  return (
    <div>
      <header>
        <h1>Armies</h1>
        <button onClick={handler}>Clear Cache</button>
      </header>
      <ul className="armiesMenu">
        {armies?.sort(sortArmies).map(army => <li key={army.id}><a href={`?army=${army.id}`}>{army.faction}: {army.name}</a></li>)}
      </ul>
    </div>
  );
}

const categorySortOrder = {
  "Combat Patrol": 0,
  "King of the Colloseum": 1,
  "Incursion": 2
}

function sortArmies(a, b) {
  if (a.category !== b.category)
  {
    return categorySortOrder[a.category] - categorySortOrder[b.category];
  }
  if (a.faction !== b.faction)
  {
    return a.faction.localeCompare(b.faction);
  }
  return a.name.localeCompare(b.name);
}

function Scoreboard()
{
  const [p1Primary, setP1Primary] = useScore(1, "Primary");
  const [p1Secondary, setP1Secondary] = useScore(1, "Secondary");
  const [p1Challenger, setP1Challenger] = useScore(1, "Challenger");
  const [p2Primary, setP2Primary] = useScore(2, "Primary");
  const [p2Secondary, setP2Secondary] = useScore(2, "Secondary");
  const [p2Challenger, setP2Challenger] = useScore(2, "Challenger");
  const resetHandler = useCallback((e) => {
    e.preventDefault();
    setP1Primary(0);
    setP1Secondary(0);
    setP1Challenger(0);
    setP2Primary(0);
    setP2Secondary(0);
    setP2Challenger(0);
  }, []);
  return (
    <div className='scoreboardView'>
      <div className="scoreboard">
        <PlayerScoreboard 
          num={1} 
          primary={p1Primary} 
          setPrimary={setP1Primary} 
          secondary={p1Secondary}
          setSecondary={setP1Secondary}
          challenger={p1Challenger}
          setChallenger={setP1Challenger}
        />
        <PlayerScoreboard 
          num={2} 
          primary={p2Primary} 
          setPrimary={setP2Primary} 
          secondary={p2Secondary}
          setSecondary={setP2Secondary}
          challenger={p2Challenger}
          setChallenger={setP2Challenger}
        />
      </div>
      <div className="resetControls">
        <button onClick={resetHandler}>Reset</button>
      </div>
    </div>
  )
}

function useScore(player, label)
{
  const scoreKey = `score-${player}-${label}`;
  var [score, setScore] = useState(() => {
    const val = localStorage.getItem(scoreKey);
    if (!val) {
      return 0;
    }
    const intVal = parseInt(localStorage.getItem(scoreKey), 10);
    if (isNaN(intVal))
    {
      return 0;
    }
    return intVal;
  });
  useEffect(() => {
    localStorage.setItem(scoreKey, score);
  }, [score]);
  return [score, setScore];
}

function PlayerScoreboard({ num, primary, setPrimary, secondary, setSecondary, challenger, setChallenger })
{
  return (
    <div className='playerScoreboard'>
      <div className="playerName">
        <label contentEditable onClick={(e) => window.getSelection().selectAllChildren(e.target)}>Player {num}</label>
      </div>
      <PlayerScore label="Primary" score={primary} setScore={setPrimary} />
      <PlayerScore label="Secondary" score={secondary} setScore={setSecondary} />
      <PlayerScore label="Challenger" score={challenger} setScore={setChallenger} />
      <div className='scoreTotal'>
        {Math.min(Math.min(primary, 50) + Math.min(secondary, 40) + Math.min(challenger, 12), 90)}
      </div>
    </div>
  );
}

function PlayerScore({ label, score, setScore }) {
  return (
    <div className='scoreRow'>
      <label className="scoreLabel">
        {label}
      </label>
      <div className="score">
        <button onClick={() => setScore(val => val - 1)}>-</button>
        <span className="scoreValue">{score}</span>
        <button onClick={() => setScore(val => val + 1)}>+</button>
      </div>
      <div className="scoreControls">
        <button onClick={() => setScore(val => val + 2)}>+2</button>
        <button onClick={() => setScore(val => val + 3)}>+3</button>
        <button onClick={() => setScore(val => val + 5)}>+5</button>
      </div>
    </div>
  )
}

function ArmyDetails({ id, armies, detachments, units, coreStrategems, appSettings, setShowInfo })
{
  const [view, setView] = useState("units");
  const [unit, setUnit] = useState(null);

  const army = useMemo(() => getArmy(armies, id), [armies, id]);
  const detachment = useMemo(() => getDetachment(detachments, army), [detachments, army]);

  const handler = useCallback((e, view) => {
    e.preventDefault();
    e.stopPropagation();
    setView(view);
  }, []);

  const onOpenUnit = useCallback((unit) => setUnit(unit), []);
  const onGoBack = useCallback(() => setUnit(null), []);

  if (army != null && unit !== null)
  {
    return (
      <UnitDetails 
        id={unit} 
        army={army}
        units={units} 
        setShowInfo={setShowInfo}
        onGoBack={onGoBack}
      />
    );
  }

  return (
    <div>
      <header>
        <a href={`/`}>&lsaquo;</a>
        <h1>{army?.name}</h1>
      </header>
      <div className="armyDetails">
        { view === "rules" ? <Rules detachment={detachment} /> : null }
        { view === "units" ? <Units army={army} units={units} appSettings={appSettings} setShowInfo={setShowInfo} onClick={onOpenUnit} /> : null }
        { view === "strategems" ? <Strategems army={army} detachment={detachment} coreStrategems={coreStrategems} /> : null }
        { view === "enhancements" ? <Enhancements detachment={detachment} /> : null }
      </div>
      <menu className="armyViews">
        <MenuItem view="rules" label="Rules" handler={handler} currentView={view} />
        <MenuItem view="units" label="Units" handler={handler} currentView={view} />
        <MenuItem view="strategems" label="Strategems" handler={handler} currentView={view} />
        <MenuItem view="enhancements" label="Enhancements" handler={handler} currentView={view} />
      </menu>
    </div>
  );
}

function getArmy(armies, id)
{
  if (!armies)
  {
    return null;
  }
  for (var i = 0; i < armies.length; i++)
  {
    if (armies[i].id === id)
    {
      return armies[i];
    }
  }
  return null;
}

function getDetachment(detachments, army)
{
  if (!army || !detachments)
  {
    return null;
  }
  return detachments.find(detachment => detachment.name === army.detachment);
}

function Units({ army, units, appSettings, setShowInfo, onClick })
{
  const armyUnits = useMemo(() => getUnits(army, units), [army, units]);

  return (
    <ol className="unitSummaries">
      {armyUnits?.map(unit => <UnitSummary key={unit.name} army={army.id} unit={unit} appSettings={appSettings} setShowInfo={setShowInfo} onClick={onClick} />)}
    </ol>
  );
}

function UnitSummary({ army, unit, appSettings, setShowInfo, onClick })
{
  const handler = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(unit.name);
  }, [unit]);
  return (
    <li><a href="#" onClick={handler}>
      <span className="unitHeader">{unit?.name}</span>
      <UnitProfile unit={unit} />
      <AbilitySummary unit={unit} appSettings={appSettings} setShowInfo={setShowInfo} />
      <OtherAbilitySummary unit={unit} />
      <WargearAbilitySummary unit={unit} />
      </a></li>
  )
}

function AbilitySummary({ unit, appSettings, setShowInfo })
{
  const abilities = getSummaryAbilties(unit, appSettings);
  const rangedWeapons = getRangedWeapons(unit, appSettings);
  const meleeWeapons = getMeleeWeapons(unit, appSettings);
  const keywordAbilities = getKeywordAbilitySummary(unit, appSettings);
  if (abilities.length === 0 && rangedWeapons.length === 0 && meleeWeapons.length === 0 && keywordAbilities.length === 0)
  {
    return null;
  }
  return (
    <ol className="abilitySummary">
      {abilities.map(ability => <li key={ability} onClick={e => setShowInfo(e, ability)}>{ability}</li>)}
      {keywordAbilities.map(keyword => <li key={keyword} onClick={e => setShowInfo(e, keyword)}>{keyword}</li>)}
      {rangedWeapons.map(weapon => <RangedWeaponSummary key={weapon.name} weapon={weapon} setShowInfo={setShowInfo} />)}
      {meleeWeapons.map(weapon => <MeleeWeaponSummary key={weapon.name} weapon={weapon} setShowInfo={setShowInfo} />)}
    </ol>
  );
}

function RangedWeaponSummary({ weapon, setShowInfo })
{
  return (
    <li>
      <span className="rangeIcon">&#8982;</span>
      <span className="range">{weapon.range}</span>
      <WeaponAbilitySummary weapon={weapon} setShowInfo={setShowInfo} />
    </li>
  )
}

function MeleeWeaponSummary({ weapon, setShowInfo })
{
  return (
    <li>
      <span className="meleeIcon">&#9876;</span>
      <WeaponAbilitySummary weapon={weapon} setShowInfo={setShowInfo} />
    </li>
  )
}

function WeaponAbilitySummary({ weapon, setShowInfo })
{
  if (!weapon.abilities || weapon.abilities.length === 0)
  {
    return null;
  }
  return (
    <span>
      {"["}
        {weapon.abilities.map((ability, index) => 
          <>
            {index > 0 ? ", " : ""}
            <span onClick={e => setShowInfo(e, ability)}>{ability}</span>
          </>
        )}
      {"]"}
    </span>
  )
}

function OtherAbilitySummary({ unit })
{
  const abilities = unit?.abilities?.other ?? [];
  if (abilities.length === 0)
  {
    return null;
  }
  return (
    <ol className="otherAbilitySummary">
      {abilities.map(ability => <li key={ability.label}><label>{ability.label}</label>{ability.value}</li>)}
    </ol>
  );
}

function WargearAbilitySummary({ unit })
{
  const abilities = unit?.abilities?.wargear ?? [];
  if (abilities.length === 0)
  {
    return null;
  }
  return (
    <ol className="otherAbilitySummary">
      {abilities.map(ability => <li key={ability.label}><label>{ability.label} (Wargear):</label>{ability.value}</li>)}
    </ol>
  );
}

function getSummaryAbilties(unit, appSettings)
{
  const ignoreAbilities = appSettings.summaryIgnoreAbilities ?? [];
  return unit?.abilities?.core?.filter(ability => {
    for (const quickAccess of ignoreAbilities)
    {
      if (ability.toLowerCase().startsWith(quickAccess))
      {
        return false;
      }
    }
    return true;
  }) ?? [];
}

function getRangedWeapons(unit, appSettings)
{
  if (!unit.ranged)
  {
    return [];
  }
  const rangedAbilitiesToSummarize = appSettings.rangedSummaryAbilities ?? [];
  const weapons = [];
  let foundProfile = false;
  unit.ranged.forEach(weapon => {
    if (weapon.profile)
    {
      if (foundProfile)
      {
        return;
      }
      foundProfile = true;
    }
    const abilities = [];
    weapon.abilities?.forEach(ability => {
      for (const summarize of rangedAbilitiesToSummarize)
      {
        if (ability.toLowerCase().startsWith(summarize) && !abilities.includes(ability))
        {
          abilities.push(ability);
        }
      }
    });
    weapons.push({ range: weapon.range, abilities: abilities });
  })
  return weapons;
}

function getMeleeWeapons(unit, appSettings)
{
  if (!unit.melee)
  {
    return [];
  }
  const meleeAbilitiesToSummarize = appSettings.meleeSummaryAbilities ?? [];
  const weapons = [];
  let foundProfile = false;
  unit.melee.forEach(weapon => {
    if (weapon.profile)
    {
      if (foundProfile)
      {
        return;
      }
      foundProfile = true;
    }
    const abilities = [];
    weapon.abilities?.forEach(ability => {
      for (const summarize of meleeAbilitiesToSummarize)
      {
        if (ability.toLowerCase().startsWith(summarize) && !abilities.includes(ability))
        {
          abilities.push(ability);
        }
      }
    });
    if (abilities.length > 0)
    {
      weapons.push({ abilities: abilities });
    }
  })
  return weapons;
}

function getKeywordAbilitySummary(unit, appSettings)
{
  const includeAbilities = appSettings.summaryKeywords ?? [];
  return unit?.keywords?.filter(ability => {
    for (const quickAccess of includeAbilities)
    {
      if (ability.toLowerCase().startsWith(quickAccess))
      {
        return true;
      }
    }
    return false;
  }) ?? [];
}

function getUnits(army, units)
{
  var result = [];
  if (!army || !units)
  {
    return result;
  }
  for (var i = 0; i < units.length; i++)
  {
    if (army.units.indexOf(units[i].name) !== -1)
    {
      result.push(units[i]);
    }
  }
  return result;
}

function UnitDetails({ id, army, units, setShowInfo, onGoBack }) 
{
  const unit = useMemo(() => getUnit(units, id), [units, id]);
  const clickHandler = useCallback((e) => {
    if (!onGoBack)
    {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    onGoBack();
  }, [onGoBack]);

  return (
    <div>
      <header>
        <a href={`?army=${army}`} onClick={clickHandler}>&lsaquo;</a>
        <h1>{unit?.name}</h1>
      </header>
      <div className="unitDetails">
        <UnitProfile unit={unit} />
        <div>
          <RangedWeapons unit={unit} setShowInfo={setShowInfo} />
          <MeleeWeapons unit={unit} setShowInfo={setShowInfo} />
        </div>
        <Composition unit={unit} />
        <Damaged unit={unit} />
        <BigGunsNeverTire unit={unit} />
        <Wargear unit={unit} />
        <Abilities unit={unit} setShowInfo={setShowInfo} />
        <Leader unit={unit} />
        <Keywords unit={unit} />
        <PatrolSquads unit={unit} />
      </div>
    </div>
  )
}

function UnitProfile({ unit })
{
  return (
    <>
      {unit?.profiles?.map(profile => 
        <div key={profile.name}>
          {unit.profiles.length > 1 ? <div className="unitProfileHeader">{profile.name}</div> : null }
          <div className="unitStats">
            <ul>
              <li>
                <UnitProfileItem label="M" value={`${profile?.m}"`} />
                <PivotValue value={profile?.p} />
              </li>
              <li><UnitProfileItem label="T" value={profile?.t} /></li>
              <li>
                <UnitProfileItem label="Sv" value={profile?.sv} />
                <InvulnerableSave value={profile?.iv} />
              </li>
              <li><UnitProfileItem label="W" value={profile?.w} /></li>
              <li><UnitProfileItem label="Ld" value={profile?.ld} /></li>
              <li><UnitProfileItem label="OC" value={profile?.oc} /></li>
            </ul>
          </div>
        </div>
    )}
    </>
  )
}

function getUnit(units, id)
{
  if (!units)
  {
    return null;
  }
  id = id.replaceAll("%20", " ");
  for (var i = 0; i < units.length; i++)
  {
    if (units[i].name === id)
    {
      return units[i];
    }
  }
  return null;
}

function UnitProfileItem({ label, value })
{
  return (
    <>
      <label className="profileItemLabel">{label}</label>
      <div className="profileItemValue">{value}</div>
    </>
  );
}

function InvulnerableSave({ value })
{
  if (!value)
  {
    return null;
  }
  return (
    <div className="invulnerableSave">
      <label className="profileItemLabel"></label>
      <div className="profileItemValue">{value}</div>
    </div>
  );
}

function PivotValue({ value })
{
  if (!value)
  {
    return null;
  }
  return (
    <div className="pivotValue">
      <label className="profileItemLabel"></label>
      <span className="pivotArrow1"></span>
      <span className="pivotArrow2"></span>
      <div className="profileItemValue">{value}"</div>
    </div>
  );
}

function RangedWeapons({ unit, setShowInfo })
{
  return (
    <WeaponTable 
      weapons={unit?.ranged} 
      label="Ranged Weapons" 
      skillLabel="BS" 
      icon="&#8982;" 
      setShowInfo={setShowInfo}
    />
  );
}

function MeleeWeapons({ unit, setShowInfo })
{
  return (
    <WeaponTable 
      weapons={unit?.melee}
      label="Melee Weapons"
      skillLabel="WS"
      icon="&#9876;"
      setShowInfo={setShowInfo}
    />
  );
}

function WeaponTable({ weapons, label, skillLabel, icon, setShowInfo })
{
  if (!weapons || weapons.length === 0)
  {
    return null;
  }
  return (
    <table className="weapons">
      <thead>
        <tr>
          <th>{icon}</th>
          <th>{label}</th>
          <th>Range</th>
          <th>A</th>
          <th>{skillLabel}</th>
          <th>S</th>
          <th>AP</th>
          <th>D</th>
        </tr>
      </thead>
      <tbody>
        {weapons.map(weapon => <Weapon weapon={weapon} setShowInfo={setShowInfo} />)}
      </tbody>
      {weapons.find(weapon => weapon.profile) ? 
        <tfoot>
          <td>&#11166;</td>
          <td className="reminderText" colspan={7}>Before selecting targets with this weapon, select one of its profiles to make attacks with.</td>
        </tfoot>
      : null}
    </table>
  )
}

function Weapon({ weapon, setShowInfo })
{
  return (
    <>
      <tr className="weaponProfile">
        <td>{weapon.profile ? <>&#11166;</> : null}</td>
        <td>
          {weapon.name}&nbsp;
        </td>
        <td>{weapon.range}</td>
        <td>{weapon.a}</td>
        <td>{weapon.bs ?? weapon.ws}</td>
        <td>{weapon.s}</td>
        <td>{weapon.ap}</td>
        <td>{weapon.d}</td>
      </tr>
      {weapon.abilities? <tr>
        <td colspan="8">
          <ol className="abilities">
            {weapon.abilities.map(ability => <li onClick={e => setShowInfo(e, ability)}>{ability}</li>)}
          </ol>
        </td>
      </tr> : null}
    </>
  )
}

function Keywords({ unit })
{
  if (!unit)
  {
    return null;
  }
  return (
    <div>
      <h2>Keywords</h2>
        <div className="keywords">
        <p>
        {unit.keywords?.join(", ")}
        </p>
        <p>
          <label>Faction Keywords:</label>
          {unit.factions?.join(", ")}
        </p>
      </div>
    </div>
  )
}

function Abilities({ unit, setShowInfo })
{
  if (!unit?.abilities)
  {
    return null;
  }
  return (
    <div>
      <h2>Abilities</h2>
      <div className="unitAbilities">
        {unit.abilities.core ? <div><label>Core:</label><ol className="abilities">
            {unit.abilities.core.map(ability => <li onClick={e => setShowInfo(e, ability)}>{ability}</li>)}
          </ol></div> : null }
        {unit.abilities.faction ? <div><label>Faction:</label><ol className="abilities">
            {unit.abilities.faction.map(ability => <li>{ability}</li>)}
          </ol></div> : null }
        {unit.abilities.other ? unit.abilities.other.map(ability => <div className="otherAbility"><label>{ability.label}</label>{ability.value}</div>) : null}
      </div>
    </div>
  )
}

function Damaged({unit})
{
  if (!unit?.damaged)
  {
    return null;
  }
  return (
    <div>
      <h2>Damaged: {unit.damaged.condition}</h2>
      <div className="unitDamaged">
        {unit.damaged.text}
      </div>
    </div>
  )
}

function BigGunsNeverTire({unit})
{
  if (!unit || !(unit.keywords.includes("Vehicle") || unit.keywords.includes("Monster")))
  {
    return null;
  }
  return (
    <div>
      <h2>Big Guns Never Tire</h2>
      <div className="unitLeader">
        MONSTER and VEHICLE units can shoot, and be shot at, even while they are within Engagement Range of enemy units. 
        Each time a ranged attack is made by or against such a unit, subtract 1 from that attack's Hit roll (unless shooting with a Pistol)
      </div>
    </div>
  )
}

function Leader({ unit })
{
  if (!unit?.abilities?.leader)
  {
    return null;
  }
  return (
    <div>
      <h2>Leader</h2>
      <div className="unitLeader">
        This model can be attached to the following unit(s):
        <ul>
          {unit.abilities.leader.map(follower => <li>{follower}</li>)}
        </ul>
      </div>
    </div>
  )
}

function Composition({ unit })
{
  if (!unit?.composition)
  {
    return null;
  }
  return (
    <div>
      <h2>Unit Composition</h2>
      <ol className="unitComposition">
        {unit.composition.map(model => <li><label>{model.label}</label>{model.value}</li>)}
      </ol>
    </div>
  );
}

function PatrolSquads({ unit })
{
  if (!unit?.squads)
  {
    return null;
  }
  return (
    <div>
      <h2>Patrol Squads</h2>
      <div className="patrolSquads">
        {unit.squads}
      </div>
    </div>
  )
}

function Wargear({unit})
{
  if (!unit?.abilities?.wargear || unit?.abilities?.wargear.length === 0)
  {
    return null;
  }
  return (
    <div>
      <h2>Wargear</h2>
      <div className="wargear">
        {unit.abilities?.wargear.map(wargear => <div><label>{wargear.label}:</label>{wargear.value}</div>)}
      </div>
    </div>
  )
}

function Rules({ detachment })
{
  return (
    <ol className="armyRules">
      {detachment?.abilities?.map(ability => <ArmyRule key={ability.name} ability={ability} />)}
    </ol>
  );
}

function ArmyRule({ ability })
{
  return (<li>
    <h2>{ability.name}:</h2>
    <span dangerouslySetInnerHTML={{ __html: ability.text}} />
  </li>);
}

function Strategems({ army, detachment, coreStrategems })
{
  const [filter, setFilter] = useState(null);
  const handler = useCallback((e, newFilter) => {
    e.preventDefault();
    e.stopPropagation();
    if (filter === newFilter) {
      setFilter(null);
    } else {
      setFilter(newFilter);
    }
  }, [filter]);

  const armyStrategems = useMemo(() => getArmyStrategems(army, detachment, coreStrategems, filter), [army, coreStrategems, filter]);

  return (
    <>
      <ol className="strategems">
        {armyStrategems?.map(strategem => <Strategem strategem={strategem} />)}
      </ol>
      <menu className="submenu">
        <MenuItem view="your" label="Your Turn" handler={handler} currentView={filter} />
        <MenuItem view="opponent" label="Opponent's Turn" handler={handler} currentView={filter} />
      </menu>
    </>
  )
}

function getArmyStrategems(army, detachment, coreStrategems, filter)
{
  const filteredStrats = army.ignorestrats ? (coreStrategems ?? []).filter(strat => !army.ignorestrats.map(strat => strat.toLowerCase()).includes(strat.name.toLowerCase())) : [...coreStrategems];
  return [...(detachment.strategems ?? []), ...filteredStrats].filter(strat => filter == null || strat.turn === filter || strat.turn === "either");
}

function Strategem({ strategem })
{
  const classList = ["strategem"];
  switch (strategem.turn)
  {
    case "your":
      classList.push("yourTurn");
      break;
    case "opponent":
      classList.push("opponentTurn");
      break;
    case "either":
      classList.push("either");
      break;
  }
  return (
    <li className={classList.join(" ")}>
      <h2>
        <span className="title">{strategem.name}</span>
        <span className="cost">{strategem.cost}CP</span>
      </h2>
      <p><label>When:</label> {strategem.when}</p>
      <p><label>Target:</label> {strategem.target}</p>
      <p><label>Effect:</label> {strategem.effect}</p>
    </li>
  )
}

function Enhancements({ detachment })
{
  return (
    <ul className="strategems">
      {detachment.enhancements?.map(enhancement => <Enhancement enhancement={enhancement} />)}
    </ul>
  )
}

function Enhancement({ enhancement })
{
  return (
    <li>
      <h2>{enhancement.name}</h2>
      <div dangerouslySetInnerHTML={{ __html: enhancement.text}} />
    </li>
  )
}

function InfoModal({ ability, abilities, setShowInfo }) {
  const abilityInfo = getAbilityInfo(ability, abilities);
  const dismissModal = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowInfo(e, null);
  }, [setShowInfo]);
  if (!abilityInfo)
  {
    return null;
  }
  return (
    <>
      <div className="modalFog" onClick={dismissModal}></div>
      <div className="infoModal">
        <h2>
          <span>{abilityInfo.name}</span>
          <button onClick={dismissModal}>X</button>
        </h2>
        <div className="infoModalContents">
          { abilityInfo.summary ? <ul className="infoAbilitySummary">
              {abilityInfo.summary.map(summary => <li>{summary}</li>)}
            </ul> 
          : null }
          <div dangerouslySetInnerHTML={{ __html: abilityInfo.text }} />
          { abilityInfo.example ? <>
              <div className="infoAbilityExample"><label>Example:</label> {abilityInfo.example}</div>
            </>
          : null }
        </div>
      </div>
    </>
  );
};

function getAbilityInfo(ability, abilities)
{
  if (!ability)
  {
    return null;
  }
  return abilities?.find(a => ability.toLowerCase().startsWith(a.name.toLowerCase()));
}

export default App;
