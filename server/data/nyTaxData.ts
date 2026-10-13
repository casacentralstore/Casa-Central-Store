// NY State Sales Tax by ZIP Code data from Casa Central Store reference sheet

export interface NyTaxEntry {
  city: string;
  zip: string;
  county: string;
  ratePercent: number;
  rateDecimal: number;
}

export const NY_TAX_RAW_CSV = `City,ZIP,County,Tax Rate
Monsey,10952,Rockland,8.75%
Spring Valley,10977,Rockland,8.75%
Buffalo,14201,Erie,8.75%
Brooklyn,11201,Kings,8.88%
Manhattan,10001,New York Tax,8.88%
Alcove,12007,Orange,8.00%
Altamont,12009,Albany,8.00%
Berne,12023,Albany,8.00%
Clarksville,12041,Albany,8.00%
Coeymans,12045,Albany,8.00%
Coeymans Hollow,12046,Albany,8.00%
Cohoes,12047,Albany,8.00%
Delmar,12054,Albany,8.00%
Dormansville,12055,Albany,8.00%
East Berne,12059,Albany,8.00%
Feura Bush,12067,Albany,8.00%
Glenmont,12077,Albany,8.00%
Guilderland,12084,Albany,8.00%
Guilderland Center,12085,Albany,8.00%
Knox,12107,Albany,8.00%
Latham,12110,Albany,8.00%
Medusa,12120,Albany,8.00%
Newtonville,12128,Albany,8.00%
Ravena,12143,Albany,8.00%
Rensselaerville,12147,Albany,8.00%
Selkirk,12158,Albany,8.00%
Slingerlands,12159,Albany,8.00%
South Bethlehem,12161,Albany,8.00%
Voorheesville,12186,Albany,8.00%
Watervliet,12189,Albany,8.00%
Westerlo,12193,Albany,8.00%
Albany,12201,Albany,8.00%
Albany,12202,Albany,8.00%
Albany,12203,Albany,8.00%
Albany,12204,Albany,8.00%
Albany,12205,Albany,8.00%
Albany,12206,Albany,8.00%
Albany,12207,Albany,8.00%
Albany,12208,Albany,8.00%
Albany,12209,Albany,8.00%
Albany,12210,Albany,8.00%
Albany,12211,Albany,8.00%
Albany,12212,Albany,8.00%
Afton,13730,Broome,8.00%
Berkshire,13736,Broome,8.00%
Bible School Park,13737,Broome,8.00%
Castle Creek,13744,Broome,8.00%
Chenango Bridge,13745,Broome,8.00%
Chenango Forks,13746,Broome,8.00%
Conklin,13748,Broome,8.00%
Corbettsville,13749,Broome,8.00%
Deposit,13754,Broome,8.00%
Endicott,13760,Broome,8.00%
Endicott,13761,Broome,8.00%
Endwell,13762,Broome,8.00%
Endicott,13763,Broome,8.00%
Glen Aubrey,13777,Broome,8.00%
Harpursville,13787,Broome,8.00%
Johnson City,13790,Broome,8.00%
Killawog,13794,Broome,8.00%
Kirkwood,13795,Broome,8.00%
Lisle,13797,Broome,8.00%
Maine,13802,Broome,8.00%
Nineveh,13813,Broome,8.00%
Ouaquaga,13826,Broome,8.00%
Port Crane,13833,Broome,8.00%
Richford,13835,Broome,8.00%
Tunnel,13848,Broome,8.00%
Vestal,13850,Broome,8.00%
Vestal,13851,Broome,8.00%
Whitney Point,13862,Broome,8.00%
Windsor,13865,Broome,8.00%
Binghamton,13901,Broome,8.00%
Binghamton,13902,Broome,8.00%
Binghamton,13903,Broome,8.00%
Binghamton,13904,Broome,8.00%
Binghamton,13905,Broome,8.00%
Auburn,13021,Cayuga,8.00%
Auburn,13022,Cayuga,8.00%
Aurora,13026,Cayuga,8.00%
Cato,13033,Cayuga,8.00%
Cayuga,13034,Cayuga,8.00%
Fair Haven,13064,Cayuga,8.00%
Genoa,13071,Cayuga,8.00%
Jordan,13080,Cayuga,8.00%
King Ferry,13081,Cayuga,8.00%
Locke,13092,Cayuga,8.00%
Martville,13111,Cayuga,8.00%
Meridian,13113,Cayuga,8.00%
Montezuma,13117,Cayuga,8.00%
Moravia,13118,Cayuga,8.00%
Poplar Ridge,13139,Cayuga,8.00%
Port Byron,13140,Cayuga,8.00%
Scipio Center,13147,Cayuga,8.00%
Sterling,13156,Cayuga,8.00%
Union Springs,13160,Cayuga,8.00%
Weedsport,13166,Cayuga,8.00%
Dunkirk,14048,Chautauqua,8.00%
Forestville,14062,Chautauqua,8.00%
Fredonia,14063,Chautauqua,8.00%
Irving,14081,Chautauqua,8.00%
Sheridan,14135,Chautauqua,8.00%
Silver Creek,14136,Chautauqua,8.00%
Van Buren Point,14166,Chautauqua,8.00%
Jamestown,14701,Chautauqua,8.00%
Jamestown,14702,Chautauqua,8.00%
Ashville,14710,Chautauqua,8.00%
Bemus Point,14712,Chautauqua,8.00%
Brocton,14716,Chautauqua,8.00%
Cassadaga,14718,Chautauqua,8.00%
Celoron,14720,Chautauqua,8.00%
Chautauqua,14722,Chautauqua,8.00%
Cherry Creek,14723,Chautauqua,8.00%
Clymer,14724,Chautauqua,8.00%
Dewittville,14728,Chautauqua,8.00%
Ellington,14732,Chautauqua,8.00%
Falconer,14733,Chautauqua,8.00%
Findley Lake,14736,Chautauqua,8.00%
Frewsburg,14738,Chautauqua,8.00%
Gerry,14740,Chautauqua,8.00%
Greenhurst,14742,Chautauqua,8.00%
Kennedy,14747,Chautauqua,8.00%
Lakewood,14750,Chautauqua,8.00%
Lily Dale,14752,Chautauqua,8.00%
Maple Springs,14756,Chautauqua,8.00%
Mayville,14757,Chautauqua,8.00%
Niobe,14758,Chautauqua,8.00%
Panama,14767,Chautauqua,8.00%
Portland,14769,Chautauqua,8.00%
Ripley,14775,Chautauqua,8.00%
Sherman,14781,Chautauqua,8.00%
Sinclairville,14782,Chautauqua,8.00%
Stockton,14784,Chautauqua,8.00%
Stow,14785,Chautauqua,8.00%
Westfield,14787,Chautauqua,8.00%
Big Flats,14814,Chemung,8.00%
Breesport,14816,Chemung,8.00%
Chemung,14825,Chemung,8.00%
Erin,14838,Chemung,8.00%
Horseheads,14845,Chemung,8.00%
Lowman,14861,Chemung,8.00%
Millport,14864,Chemung,8.00%
Pine City,14871,Chemung,8.00%
Pine Valley,14872,Chemung,8.00%
Van Etten,14889,Chemung,8.00%
Wellsburg,14894,Chemung,8.00%
Elmira,14901,Chemung,8.00%
Elmira,14902,Chemung,8.00%
Elmira,14903,Chemung,8.00%
Elmira,14904,Chemung,8.00%
Elmira,14905,Chemung,8.00%
Cincinnatus,13040,Chenango,8.00%
De Ruyter,13052,Chenango,8.00%
Georgetown,13072,Chenango,8.00%
North Pitcher,13124,Chenango,8.00%
Pitcher,13136,Chenango,8.00%
South Otselic,13155,Chenango,8.00%
Earlville,13332,Chenango,8.00%
New Berlin,13411,Chenango,8.00%
Sherburne,13460,Chenango,8.00%
Smyrna,13464,Chenango,8.00%
West Edmeston,13485,Chenango,8.00%
Afton,13730,Chenango,8.00%
Bainbridge,13733,Chenango,8.00%
Chenango Forks,13746,Chenango,8.00%
East Pharsalia,13758,Chenango,8.00%
Greene,13778,Chenango,8.00%
Guilford,13780,Chenango,8.00%
Harpursville,13787,Chenango,8.00%
McDonough,13801,Chenango,8.00%
Mount Upton,13809,Chenango,8.00%
Nineveh,13813,Chenango,8.00%
North Norwich,13814,Chenango,8.00%
Norwich,13815,Chenango,8.00%
Oxford,13830,Chenango,8.00%
Plymouth,13832,Chenango,8.00%
Port Crane,13833,Chenango,8.00%
Smithville Flats,13841,Chenango,8.00%
South New Berlin,13843,Chenango,8.00%
South Plymouth,13844,Chenango,8.00%
Willet,13863,Chenango,8.00%
Altona,12910,Clinton,8.00%
Au Sable Forks,12912,Clinton,8.00%
Cadyville,12918,Clinton,8.00%
Champlain,12919,Clinton,8.00%
Chazy,12921,Clinton,8.00%
Churubusco,12923,Clinton,8.00%
Clintonville,12924,Clinton,8.00%
Dannemora,12929,Clinton,8.00%
Ellenburg Center,12934,Clinton,8.00%
Ellenburg Depot,12935,Clinton,8.00%
Keeseville,12944,Clinton,8.00%
Lyon Mountain,12952,Clinton,8.00%
Merrill,12955,Clinton,8.00%
Mooers,12958,Clinton,8.00%
Mooers Forks,12959,Clinton,8.00%
Morrisonville,12962,Clinton,8.00%
Peru,12972,Clinton,8.00%
Redford,12978,Clinton,8.00%
Rouses Point,12979,Clinton,8.00%
Saranac,12981,Clinton,8.00%
Schuyler Falls,12985,Clinton,8.00%
West Chazy,12992,Clinton,8.00%
Plattsburgh,12901,Clinton,8.00%
Plattsburgh,12903,Clinton,8.00%
Keeseville,12911,Clinton,8.00%
Ellenburg,12933,Clinton,8.00%
Chatham,12037,Columbia,8.00%
East Chatham,12060,Columbia,8.00%
Ghent,12075,Columbia,8.00%
Kinderhook,12106,Columbia,8.00%
Malden Bridge,12115,Columbia,8.00%
New Lebanon,12125,Columbia,8.00%
Niverville,12130,Columbia,8.00%
North Chatham,12132,Columbia,8.00%
Old Chatham,12136,Columbia,8.00%
Spencertown,12165,Columbia,8.00%
Stottville,12172,Columbia,8.00%
Stuyvesant,12173,Columbia,8.00%
Stuyvesant Falls,12174,Columbia,8.00%
Valatie,12184,Columbia,8.00%
West Lebanon,12195,Columbia,8.00%
Ancram,12502,Columbia,8.00%
Ancramdale,12503,Columbia,8.00%
Claverack,12513,Columbia,8.00%
Copake,12516,Columbia,8.00%
Copake Falls,12517,Columbia,8.00%
Craryville,12521,Columbia,8.00%
Elizaville,12523,Columbia,8.00%
Germantown,12526,Columbia,8.00%
Hillsdale,12529,Columbia,8.00%
Hollowville,12530,Columbia,8.00%
Hudson,12534,Columbia,8.00%
Livingston,12541,Columbia,8.00%
Mellenville,12544,Columbia,8.00%
Taghkanic,12523,Columbia,8.00%
Gallatin,12567,Columbia,8.00%
Stockport,12594,Columbia,8.00%
Clermont,12526,Columbia,8.00%
Cincinnatus,13040,Cortland,8.00%
Cortland,13045,Cortland,8.00%
East Homer,13056,Cortland,8.00%
Homer,13077,Cortland,8.00%
Little York,13087,Cortland,8.00%
McGraw,13101,Cortland,8.00%
Preble,13141,Cortland,8.00%
Truxton,13158,Cortland,8.00%
Blodgett Mills,13738,Cortland,8.00%
Harford,13784,Cortland,8.00%
Marathon,13803,Cortland,8.00%
Willet,13863,Cortland,8.00%
Arkville,12406,Delaware,8.00%
Denver,12421,Delaware,8.00%
Fleischmanns,12430,Delaware,8.00%
Grand Gorge,12434,Delaware,8.00%
Halcottsville,12438,Delaware,8.00%
New Kingston,12459,Delaware,8.00%
Roxbury,12474,Delaware,8.00%
Andes,13731,Delaware,8.00%
Bloomville,13739,Delaware,8.00%
Bovina Center,13740,Delaware,8.00%
Davenport,13750,Delaware,8.00%
Davenport Center,13751,Delaware,8.00%
Delancey,13752,Delaware,8.00%
Delhi,13753,Delaware,8.00%
Downsville,13755,Delaware,8.00%
East Branch,13756,Delaware,8.00%
East Meredith,13757,Delaware,8.00%
Fishs Eddy,13774,Delaware,8.00%
Franklin,13775,Delaware,8.00%
Hamden,13782,Delaware,8.00%
Hancock,13783,Delaware,8.00%
Harpersfield,13786,Delaware,8.00%
Hobart,13788,Delaware,8.00%
Masonville,13804,Delaware,8.00%
Meridale,13806,Delaware,8.00%
Sidney,13838,Delaware,8.00%
Sidney Center,13839,Delaware,8.00%
South Kortright,13842,Delaware,8.00%
Treadwell,13846,Delaware,8.00%
Trout Creek,13847,Delaware,8.00%
Walton,13856,Delaware,8.00%
West Davenport,13860,Delaware,8.00%
Stamford,12167,Delaware,8.00%
Margaretville,12455,Delaware,8.00%
Minerva,12851,Essex,8.00%
Newcomb,12852,Essex,8.00%
North Hudson,12855,Essex,8.00%
Olmstedville,12857,Essex,8.00%
Paradox,12858,Essex,8.00%
Schroon Lake,12870,Essex,8.00%
Severance,12872,Essex,8.00%
Newcomb,12879,Essex,8.00%
Ticonderoga,12883,Essex,8.00%
Bloomingdale,12913,Essex,8.00%
Crown Point,12928,Essex,8.00%
Elizabethtown,12932,Essex,8.00%
Essex,12936,Essex,8.00%
Jay,12941,Essex,8.00%
Keene,12942,Essex,8.00%
Keene Valley,12943,Essex,8.00%
Lake Placid,12946,Essex,8.00%
Lewis,12950,Essex,8.00%
Mineville,12956,Essex,8.00%
Moriah,12960,Essex,8.00%
Moriah Center,12961,Essex,8.00%
New Russia,12964,Essex,8.00%
Port Henry,12974,Essex,8.00%
Port Kent,12975,Essex,8.00%
Ray Brook,12977,Essex,8.00%
Upper Jay,12987,Essex,8.00%
Westport,12993,Essex,8.00%
Willsboro,12996,Essex,8.00%
Wilmington,12997,Essex,8.00%
Witherbee,12998,Essex,8.00%
Malone,12953,Franklin,8.00%
Saranac Lake,12983,Franklin,8.00%
Tupper Lake,12986,Franklin,8.00%
Hogansburg,13655,Franklin,8.00%
North Bangor,12966,Franklin,8.00%
Chateaugay,12920,Franklin,8.00%
Constable,12926,Franklin,8.00%
Brushton,12916,Franklin,8.00%
Moira,12957,Franklin,8.00%
Fort Covington,12937,Franklin,8.00%
Burke,12917,Franklin,8.00%
Vermontville,12989,Franklin,8.00%
Paul Smiths,12970,Franklin,8.00%
Saint Regis Falls,12980,Franklin,8.00%
Dickinson Center,12930,Franklin,8.00%
Bombay,12914,Franklin,8.00%
Lake Clear,12945,Franklin,8.00%
Owls Head,12969,Franklin,8.00%
Gabriels,12939,Franklin,8.00%
Rainbow Lake,12976,Franklin,8.00%
Brainardsville,12915,Franklin,8.00%
Whippleville,12995,Franklin,8.00%
Adams,13605,Jefferson,8.00%
Adams Center,13606,Jefferson,8.00%
Alexandria Bay,13607,Jefferson,8.00%
Antwerp,13608,Jefferson,8.00%
Belleville,13611,Jefferson,8.00%
Black River,13612,Jefferson,8.00%
Brownville,13615,Jefferson,8.00%
Calcium,13616,Jefferson,8.00%
Cape Vincent,13618,Jefferson,8.00%
Carthage,13619,Jefferson,8.00%
Chaumont,13622,Jefferson,8.00%
Clayton,13624,Jefferson,8.00%
Depauville,13632,Jefferson,8.00%
Dexter,13634,Jefferson,8.00%
Ellisburg,13636,Jefferson,8.00%
Evans Mills,13637,Jefferson,8.00%
Felts Mills,13638,Jefferson,8.00%
Fort Drum,13602,Jefferson,8.00%
Great Bend,13643,Jefferson,8.00%
Henderson,13650,Jefferson,8.00%
Henderson Harbor,13651,Jefferson,8.00%
La Fargeville,13656,Jefferson,8.00%
Limerick,13657,Jefferson,8.00%
Lorraine,13659,Jefferson,8.00%
Mannsville,13661,Jefferson,8.00%
Natural Bridge,13665,Jefferson,8.00%
Pamelia,13601,Jefferson,8.00%
Philadelphia,13673,Jefferson,8.00%
Pierrepont Manor,13674,Jefferson,8.00%
Plessis,13675,Jefferson,8.00%
Redwood,13679,Jefferson,8.00%
Rodman,13682,Jefferson,8.00%
Sackets Harbor,13685,Jefferson,8.00%
Theresa,13691,Jefferson,8.00%
Thousand Island Park,13692,Jefferson,8.00%
Three Mile Bay,13693,Jefferson,8.00%
Watertown,13601,Jefferson,8.00%
Watertown,13603,Jefferson,8.00%
Wellesley Island,13640,Jefferson,8.00%
Fishers Landing,13641,Jefferson,8.00%
Hounsfield,13642,Jefferson,8.00%
Canastota,13032,Madison,8.00%
Cazenovia,13035,Madison,8.00%
Chittenango,13037,Madison,8.00%
De Ruyter,13052,Madison,8.00%
Eaton,13334,Madison,8.00%
Georgetown,13072,Madison,8.00%
Hamilton,13346,Madison,8.00%
Madison,13402,Madison,8.00%
Morrisville,13408,Madison,8.00%
Munnsville,13409,Madison,8.00%
New Woodstock,13122,Madison,8.00%
Oneida,13421,Madison,8.00%
West Edmeston,13485,Madison,8.00%
Bouckville,13310,Madison,8.00%
Brookfield,13314,Madison,8.00%
Earlville,13332,Madison,8.00%
Hubbardsville,13355,Madison,8.00%
Lebanon,13325,Madison,8.00%
Nelson,13811,Madison,8.00%
Stockbridge,13409,Madison,8.00%
Sullivan,13037,Madison,8.00%
Fenner,13033,Madison,8.00%
Lincoln,13033,Madison,8.00%
Smithfield,13403,Madison,8.00%
Webster,14580,Orange - Monroe,8.00%
Fairport,14450,Orange - Monroe,8.00%
Rochester,14609,Orange - Monroe,8.00%
Rochester,14624,Orange - Monroe,8.00%
Rochester,14612,Orange - Monroe,8.00%
Pittsford,14534,Orange - Monroe,8.00%
Rochester,14621,Orange - Monroe,8.00%
Rochester,14626,Orange - Monroe,8.00%
Rochester,14616,Orange - Monroe,8.00%
Rochester,14623,Orange - Monroe,8.00%
Rochester,14606,Orange - Monroe,8.00%
Rochester,14618,Orange - Monroe,8.00%
Rochester,14620,Orange - Monroe,8.00%
Rochester,14617,Orange - Monroe,8.00%
Brockport,14420,Orange - Monroe,8.00%
Penfield,14526,Orange - Monroe,8.00%
Hilton,14468,Orange - Monroe,8.00%
Rochester,14607,Orange - Monroe,8.00%
Rochester,14615,Orange - Monroe,8.00%
Spencerport,14559,Orange - Monroe,8.00%
Rochester,14611,Orange - Monroe,8.00%
Rochester,14613,Orange - Monroe,8.00%
Rochester,14610,Orange - Monroe,8.00%
Rochester,14619,Orange - Monroe,8.00%
West Henrietta,14586,Orange - Monroe,8.00%
Rochester,14608,Orange - Monroe,8.00%
Rochester,14622,Orange - Monroe,8.00%
Rochester,14605,Orange - Monroe,8.00%
Rochester,14625,Orange - Monroe,8.00%
Henrietta,14467,Orange - Monroe,8.00%
Honeoye Falls,14472,Orange - Monroe,8.00%
Churchville,14428,Orange - Monroe,8.00%
East Rochester,14445,Orange - Monroe,8.00%
Hamlin,14464,Orange - Monroe,8.00%
North Chili,14514,Orange - Monroe,8.00%
Scottsville,14546,Orange - Monroe,8.00%
Rush,14543,Orange - Monroe,8.00%
Rochester,14604,Orange - Monroe,8.00%
Rochester,14627,Orange - Monroe,8.00%
Rochester,14614,Orange - Monroe,8.00%
Mendon,14506,Orange - Monroe,8.00%
Mumford,14511,Orange - Monroe,8.00%
North Greece,14515,Orange - Monroe,8.00%
Rochester,14642,Orange - Monroe,8.00%
Rochester,14602,Orange - Monroe,8.00%
Rochester,14692,Orange - Monroe,8.00%
Rochester,14649,Orange - Monroe,8.00%
Rochester,14644,Orange - Monroe,8.00%
Rochester,14643,Orange - Monroe,8.00%
Rochester,14638,Orange - Monroe,8.00%
Rochester,14646,Orange - Monroe,8.00%
Rochester,14639,Orange - Monroe,8.00%
Rochester,14694,Orange - Monroe,8.00%
Rochester,14652,Orange - Monroe,8.00%
Rochester,14653,Orange - Monroe,8.00%
Rochester,14647,Orange - Monroe,8.00%
Morton,14508,Orange - Monroe,8.00%
Rochester,14651,Orange - Monroe,8.00%
Rochester,14650,Orange - Monroe,8.00%
Rochester,14603,Orange - Monroe,8.00%
Adams Basin,14410,Orange - Monroe,8.00%
Clarkson,14430,Orange - Monroe,8.00%
Appleton,14008,Niagara,8.00%
Barker,14012,Niagara,8.00%
Burt,14028,Niagara,8.00%
Gasport,14067,Niagara,8.00%
Lewiston,14092,Niagara,8.00%
Lockport,14094,Niagara,8.00%
Lockport,14095,Niagara,8.00%
Middleport,14105,Niagara,8.00%
Model City,14107,Niagara,8.00%
Newfane,14108,Niagara,8.00%
Niagara University,14109,Niagara,8.00%
North Tonawanda,14120,Niagara,8.00%
Olcott,14126,Niagara,8.00%
Ransomville,14131,Niagara,8.00%
Sanborn,14132,Niagara,8.00%
Stella Niagara,14144,Niagara,8.00%
Wilson,14172,Niagara,8.00%
Youngstown,14174,Niagara,8.00%
Niagara Falls,14301,Niagara,8.00%
Niagara Falls,14302,Niagara,8.00%
Niagara Falls,14303,Niagara,8.00%
Niagara Falls,14304,Niagara,8.00%
Niagara Falls,14305,Niagara,8.00%
Rome,13440,Oneida,8.00%
Utica,13501,Oneida,8.00%
Utica,13502,Oneida,8.00%
New Hartford,13413,Oneida,8.00%
Whitesboro,13492,Oneida,8.00%
Clinton,13323,Oneida,8.00%
Marcy,13403,Oneida,8.00%
Camden,13316,Oneida,8.00%
Boonville,13309,Oneida,8.00%
New York Mills,13417,Oneida,8.00%
Blossvale,13308,Oneida,8.00%
Sauquoit,13456,Oneida,8.00%
Holland Patent,13354,Oneida,8.00%
Waterville,13480,Oneida,8.00%
Verona,13478,Oneida,8.00%
Remsen,13438,Oneida,8.00%
Sherrill,13461,Oneida,8.00%
Taberg,13471,Oneida,8.00%
Vernon,13476,Oneida,8.00%
Oriskany,13424,Oneida,8.00%
Oriskany Falls,13425,Oneida,8.00%
Lee Center,13363,Oneida,8.00%
Yorkville,13495,Oneida,8.00%
Barneveld,13304,Oneida,8.00%
Vernon Center,13477,Oneida,8.00%
Ava,13303,Oneida,8.00%
Durhamville,13054,Oneida,8.00%
Deansboro,13328,Oneida,8.00%
Forestport,13338,Oneida,8.00%
Clayville,13322,Oneida,8.00%
Westmoreland,13490,Oneida,8.00%
Cassville,13318,Oneida,8.00%
Stittville,13469,Oneida,8.00%
Clark Mills,13321,Oneida,8.00%
Westernville,13486,Oneida,8.00%
Bridgewater,13313,Oneida,8.00%
Sylvan Beach,13157,Oneida,8.00%
Westdale,13483,Oneida,8.00%
Woodgate,13494,Oneida,8.00%
Chadwicks,13319,Oneida,8.00%
Prospect,13435,Oneida,8.00%
Verona Beach,13162,Oneida,8.00%
North Bay,13123,Oneida,8.00%
Sangerfield,13455,Oneida,8.00%
Alder Creek,13301,Oneida,8.00%
Rome,13441,Oneida,8.00%
Hinckley,13352,Oneida,8.00%
Rome,13442,Oneida,8.00%
Mc Connellsville,13401,Oneida,8.00%
Knoxboro,13362,Oneida,8.00%
Utica,13504,Oneida,8.00%
Franklin Springs,13341,Oneida,8.00%
Washington Mills,13479,Oneida,8.00%
Rome,13449,Oneida,8.00%
Utica,13599,Oneida,8.00%
Utica,13505,Oneida,8.00%
Utica,13503,Oneida,8.00%
Baldwinsville,13027,Onondaga,8.00%
Liverpool,13090,Onondaga,8.00%
Syracuse,13208,Onondaga,8.00%
Liverpool,13088,Onondaga,8.00%
Syracuse,13212,Onondaga,8.00%
Syracuse,13210,Onondaga,8.00%
Syracuse,13204,Onondaga,8.00%
Syracuse,13205,Onondaga,8.00%
Cicero,13039,Onondaga,8.00%
Camillus,13031,Onondaga,8.00%
Syracuse,13206,Onondaga,8.00%
Syracuse,13203,Onondaga,8.00%
Manlius,13104,Onondaga,8.00%
Syracuse,13215,Onondaga,8.00%
Syracuse,13219,Onondaga,8.00%
East Syracuse,13057,Onondaga,8.00%
Syracuse,13209,Onondaga,8.00%
Fayetteville,13066,Onondaga,8.00%
Clay,13041,Onondaga,8.00%
Syracuse,13207,Onondaga,8.00%
Jamesville,13078,Onondaga,8.00%
Syracuse,13244,Onondaga,8.00%
Syracuse,13214,Onondaga,8.00%
Syracuse,13224,Onondaga,8.00%
Brewerton,13029,Onondaga,8.00%
Skaneateles,13152,Onondaga,8.00%
Syracuse,13202,Onondaga,8.00%
Syracuse,13211,Onondaga,8.00%
Marcellus,13108,Onondaga,8.00%
Tully,13159,Onondaga,8.00%
Kirkville,13082,Onondaga,8.00%
La Fayette,13084,Onondaga,8.00%
Minoa,13116,Onondaga,8.00%
Bridgeport,13030,Onondaga,8.00%
Jordan,13080,Onondaga,8.00%
Warners,13164,Onondaga,8.00%
Elbridge,13060,Onondaga,8.00%
Marietta,13110,Onondaga,8.00%
Memphis,13112,Onondaga,8.00%
Nedrow,13120,Onondaga,8.00%
Fabius,13063,Onondaga,8.00%
Skaneateles Falls,13153,Onondaga,8.00%
Pompey,13138,Onondaga,8.00%
Apulia Station,13020,Onondaga,8.00%
Delphi Falls,13051,Onondaga,8.00%
Mottville,13119,Onondaga,8.00%
Syracuse,13290,Onondaga,8.00%
Syracuse,13261,Onondaga,8.00%
Syracuse,13217,Onondaga,8.00%
Syracuse,13218,Onondaga,8.00%
Syracuse,13201,Onondaga,8.00%
Syracuse,13235,Onondaga,8.00%
Syracuse,13225,Onondaga,8.00%
Plainville,13137,Onondaga,8.00%
Syracuse,13220,Onondaga,8.00%
Syracuse,13252,Onondaga,8.00%
Syracuse,13250,Onondaga,8.00%
Syracuse,13251,Onondaga,8.00%
Syracuse,13221,Onondaga,8.00%
Liverpool,13089,Onondaga,8.00%
Canandaigua,14424,Ontario,8.00%
Geneva,14456,Ontario,8.00%
Victor,14564,Ontario,8.00%
Farmington,14425,Ontario,8.00%
Bloomfield,14469,Ontario,8.00%
Clifton Springs,14432,Ontario,8.00%
Naples,14512,Ontario,8.00%
Phelps,14532,Ontario,8.00%
Shortsville,14548,Ontario,8.00%
Honeoye,14471,Ontario,8.00%
Stanley,14561,Ontario,8.00%
Manchester,14504,Ontario,8.00%
Hall,14463,Ontario,8.00%
Ionia,14475,Ontario,8.00%
Port Gibson,14537,Ontario,8.00%
West Bloomfield,14585,Ontario,8.00%
Fishers,14453,Ontario,8.00%
Oaks Corners,14518,Ontario,8.00%
Gorham,14461,Ontario,8.00%
Seneca Castle,14547,Ontario,8.00%
East Bloomfield,14443,Ontario,8.00%
Albion,14411,Orleans,8.00%
Medina,14103,Orleans,8.00%
Holley,14470,Orleans,8.00%
Lyndonville,14098,Orleans,8.00%
Kendall,14476,Orleans,8.00%
Kent,14477,Orleans,8.00%
Waterport,14571,Orleans,8.00%
Knowlesville,14479,Orleans,8.00%
Fancher,14452,Orleans,8.00%
Clarendon,14429,Orleans,8.00%
Averill Park,12018,Rensselaer,8.00%
Berlin,12022,Rensselaer,8.00%
Brainard,12024,Rensselaer,8.00%
Castleton On Hudson,12033,Rensselaer,8.00%
Cherry Plain,12040,Rensselaer,8.00%
Cropseyville,12052,Rensselaer,8.00%
Eagle Bridge,12057,Rensselaer,8.00%
East Greenbush,12061,Rensselaer,8.00%
East Nassau,12062,Rensselaer,8.00%
East Schodack,12063,Rensselaer,8.00%
Grafton,12082,Rensselaer,8.00%
Hoosick,12089,Rensselaer,8.00%
Hoosick Falls,12090,Rensselaer,8.00%
Johnsonville,12094,Rensselaer,8.00%
Melrose,12121,Rensselaer,8.00%
Nassau,12123,Rensselaer,8.00%
North Hoosick,12133,Rensselaer,8.00%
Petersburg,12138,Rensselaer,8.00%
Pittstown,12094,Rensselaer,8.00%
Poestenkill,12140,Rensselaer,8.00%
Rensselaer,12144,Rensselaer,8.00%
Sand Lake,12153,Rensselaer,8.00%
Schaghticoke,12154,Rensselaer,8.00%
Schodack,12156,Rensselaer,8.00%
South Schodack,12162,Rensselaer,8.00%
Stephentown,12168,Rensselaer,8.00%
Valley Falls,12185,Rensselaer,8.00%
Waterford,12188,Rensselaer,8.00%
West Sand Lake,12196,Rensselaer,8.00%
Wynantskill,12198,Rensselaer,8.00%
Troy,12180,Rensselaer,8.00%
Ballston Lake,12019,Saratoga,8.00%
Ballston Spa,12020,Saratoga,8.00%
Burnt Hills,12027,Saratoga,8.00%
Clifton Park,12065,Saratoga,8.00%
Galway,12074,Saratoga,8.00%
Mechanicville,12118,Saratoga,8.00%
Rexford,12148,Saratoga,8.00%
Round Lake,12151,Saratoga,8.00%
Stillwater,12170,Saratoga,8.00%
Waterford,12188,Saratoga,8.00%
South Glens Falls,12803,Saratoga,8.00%
Corinth,12822,Saratoga,8.00%
Gansevoort,12831,Saratoga,8.00%
Greenfield Center,12833,Saratoga,8.00%
Hadley,12835,Saratoga,8.00%
Middle Grove,12850,Saratoga,8.00%
Porter Corners,12859,Saratoga,8.00%
Rock City Falls,12863,Saratoga,8.00%
Saratoga Springs,12866,Saratoga,8.00%
Schuylerville,12871,Saratoga,8.00%
Victory Mills,12884,Saratoga,8.00%
Schenectady,12301,Schenectady,8.00%
Schenectady,12302,Schenectady,8.00%
Schenectady,12303,Schenectady,8.00%
Schenectady,12304,Schenectady,8.00%
Schenectady,12305,Schenectady,8.00%
Schenectady,12306,Schenectady,8.00%
Schenectady,12307,Schenectady,8.00%
Schenectady,12308,Schenectady,8.00%
Schenectady,12309,Schenectady,8.00%
Schenectady,12325,Schenectady,8.00%
Schenectady,12345,Schenectady,8.00%
Delanson,12053,Schenectady,8.00%
Duanesburg,12056,Schenectady,8.00%
Pattersonville,12137,Schenectady,8.00%
Rotterdam Junction,12150,Schenectady,8.00%
Alplaus,12008,Schenectady,8.00%
Quaker Street,12141,Schenectady,8.00%
Cobleskill,12043,Schoharie,8.00%
Schoharie,12157,Schoharie,8.00%
Middleburgh,12122,Schoharie,8.00%
Richmondville,12149,Schoharie,8.00%
Sharon Springs,13459,Schoharie,8.00%
Gilboa,12076,Schoharie,8.00%
Jefferson,12093,Schoharie,8.00%
Howes Cave,12092,Schoharie,8.00%
Warnerville,12187,Schoharie,8.00%
Sloansville,12160,Schoharie,8.00%
Summit,12175,Schoharie,8.00%
Central Bridge,12035,Schoharie,8.00%
Fultonham,12071,Schoharie,8.00%
Charlotteville,12036,Schoharie,8.00%
North Blenheim,12131,Schoharie,8.00%
West Fulton,12194,Schoharie,8.00%
Carlisle,12031,Schoharie,8.00%
Gallupville,12073,Schoharie,8.00%
Watkins Glen,14891,Schuyler,8.00%
Beaver Dams,14812,Schuyler,8.00%
Montour Falls,14865,Schuyler,8.00%
Burdett,14818,Schuyler,8.00%
Odessa,14869,Schuyler,8.00%
Alpine,14805,Schuyler,8.00%
Hector,14841,Schuyler,8.00%
Cayuta,14824,Schuyler,8.00%
Bradford,14815,Schuyler,8.00%
Rock Stream,14878,Schuyler,8.00%
Wayne,14893,Schuyler,8.00%
Mecklenburg,14863,Schuyler,8.00%
Tyrone,14887,Schuyler,8.00%
Reading Center,14876,Schuyler,8.00%
Seneca Falls,13148,Seneca,8.00%
Waterloo,13165,Seneca,8.00%
Romulus,14541,Seneca,8.00%
Ovid,14521,Seneca,8.00%
Interlaken,14847,Seneca,8.00%
Lodi,14860,Seneca,8.00%
Willard,14588,Seneca,8.00%
Fayette,13065,Seneca,8.00%
Massena,13662,St. Lawrence,8.00%
Ogdensburg,13669,St. Lawrence,8.00%
Potsdam,13676,St. Lawrence,8.00%
Canton,13617,St. Lawrence,8.00%
Gouverneur,13642,St. Lawrence,8.00%
Norwood,13668,St. Lawrence,8.00%
Norfolk,13667,St. Lawrence,8.00%
Brasher Falls,13613,St. Lawrence,8.00%
Hammond,13646,St. Lawrence,8.00%
Potsdam,13699,St. Lawrence,8.00%
Lisbon,13658,St. Lawrence,8.00%
Heuvelton,13654,St. Lawrence,8.00%
Hermon,13652,St. Lawrence,8.00%
Winthrop,13697,St. Lawrence,8.00%
Colton,13625,St. Lawrence,8.00%
Madrid,13660,St. Lawrence,8.00%
Waddington,13694,St. Lawrence,8.00%
Edwards,13635,St. Lawrence,8.00%
North Lawrence,12967,St. Lawrence,8.00%
Rensselaer Falls,13680,St. Lawrence,8.00%
De Kalb Junction,13630,St. Lawrence,8.00%
Russell,13684,St. Lawrence,8.00%
Star Lake,13690,St. Lawrence,8.00%
Richville,13681,St. Lawrence,8.00%
Chase Mills,13621,St. Lawrence,8.00%
South Colton,13687,St. Lawrence,8.00%
Parishville,13672,St. Lawrence,8.00%
De Peyster,13633,St. Lawrence,8.00%
Morristown,13664,St. Lawrence,8.00%
Oswegatchie,13670,St. Lawrence,8.00%
Nicholville,12965,St. Lawrence,8.00%
Cranberry Lake,12927,St. Lawrence,8.00%
Newton Falls,13666,St. Lawrence,8.00%
Brier Hill,13614,St. Lawrence,8.00%
West Stockholm,13696,St. Lawrence,8.00%
Wanakena,13695,St. Lawrence,8.00%
Piercefield,12973,St. Lawrence,8.00%
Chippewa Bay,13623,St. Lawrence,8.00%
Helena,13649,St. Lawrence,8.00%
Childwold,12922,St. Lawrence,8.00%
Rooseveltown,13683,St. Lawrence,8.00%
Hannawa Falls,13647,St. Lawrence,8.00%
Fine,13639,St. Lawrence,8.00%
Raymondville,13678,St. Lawrence,8.00%
Hailesboro,13645,St. Lawrence,8.00%
Pyrites,13677,St. Lawrence,8.00%
Lawrenceville,12949,St. Lawrence,8.00%
Owego,13827,Tioga,8.00%
Waverly,14892,Tioga,8.00%
Apalachin,13732,Tioga,8.00%
Spencer,14883,Tioga,8.00%
Newark Valley,13811,Tioga,8.00%
Candor,13743,Tioga,8.00%
Nichols,13812,Tioga,8.00%
Barton,13734,Tioga,8.00%
Berkshire,13736,Tioga,8.00%
Richford,13835,Tioga,8.00%
Willseyville,13864,Tioga,8.00%
Lockwood,14859,Tioga,8.00%
Smithboro,13840,Tioga,8.00%
Tioga Center,13845,Tioga,8.00%
Ithaca,14850,Tompkins,8.00%
Trumansburg,14886,Tompkins,8.00%
Groton,13073,Tompkins,8.00%
Newfield,14867,Tompkins,8.00%
Dryden,13053,Tompkins,8.00%
Freeville,13068,Tompkins,8.00%
Lansing,14882,Tompkins,8.00%
Brooktondale,14817,Tompkins,8.00%
Ithaca,14853,Tompkins,8.00%
Etna,13062,Tompkins,8.00%
Slaterville Springs,14881,Tompkins,8.00%
Jacksonville,14854,Tompkins,8.00%
Mc Lean,13102,Tompkins,8.00%
Ithaca,14851,Tompkins,8.00%
Ithaca,14852,Tompkins,8.00%
Queensbury,12804,Warren,8.00%
Glens Falls,12801,Warren,8.00%
Warrensburg,12885,Warren,8.00%
Lake George,12845,Warren,8.00%
Lake Luzerne,12846,Warren,8.00%
Chestertown,12817,Warren,8.00%
North Creek,12853,Warren,8.00%
Bolton Landing,12814,Warren,8.00%
Diamond Point,12824,Warren,8.00%
Brant Lake,12815,Warren,8.00%
Stony Creek,12878,Warren,8.00%
Hague,12836,Warren,8.00%
Athol,12810,Warren,8.00%
Johnsburg,12843,Warren,8.00%
Pottersville,12860,Warren,8.00%
Adirondack,12808,Warren,8.00%
North River,12856,Warren,8.00%
Wevertown,12886,Warren,8.00%
Silver Bay,12874,Warren,8.00%
Bakers Mills,12811,Warren,8.00%
Kattskill Bay,12844,Warren,8.00%
Riparius,12862,Warren,8.00%
Cleverdale,12820,Warren,8.00%
Hudson Falls,12839,Washington,8.00%
Fort Edward,12828,Washington,8.00%
Granville,12832,Washington,8.00%
Greenwich,12834,Washington,8.00%
Cambridge,12816,Washington,8.00%
Whitehall,12887,Washington,8.00%
Fort Ann,12827,Washington,8.00%
Argyle,12809,Washington,8.00%
Salem,12865,Washington,8.00%
Comstock,12821,Washington,8.00%
Buskirk,12028,Washington,8.00%
Hampton,12837,Washington,8.00%
Shushan,12873,Washington,8.00%
Hartford,12838,Washington,8.00%
Cossayuna,12823,Washington,8.00%
Putnam Station,12861,Washington,8.00%
Middle Granville,12849,Washington,8.00%
Clemons,12819,Washington,8.00%
North Granville,12854,Washington,8.00%
Huletts Landing,12841,Washington,8.00%
Middle Falls,12848,Washington,8.00%
Newark,14513,Wayne,8.00%
Ontario,14519,Wayne,8.00%
Macedon,14502,Wayne,8.00%
Palmyra,14522,Wayne,8.00%
Williamson,14589,Wayne,8.00%
Lyons,14489,Wayne,8.00%
Walworth,14568,Wayne,8.00%
Wolcott,14590,Wayne,8.00%
Marion,14505,Wayne,8.00%
Sodus,14551,Wayne,8.00%
Clyde,14433,Wayne,8.00%
Red Creek,13143,Wayne,8.00%
North Rose,14516,Wayne,8.00%
Savannah,13146,Wayne,8.00%
Sodus Point,14555,Wayne,8.00%
Alton,14413,Wayne,8.00%
South Butler,13154,Wayne,8.00%
Rose,14542,Wayne,8.00%
Union Hill,14563,Wayne,8.00%
Ontario Center,14520,Wayne,8.00%
East Williamson,14449,Wayne,8.00%
Pultneyville,14538,Wayne,8.00%
Penn Yan,14527,Yates,8.00%
Dundee,14837,Yates,8.00%
Rushville,14544,Yates,8.00%
Keuka Park,14478,Yates,8.00%
Middlesex,14507,Yates,8.00%
Branchport,14418,Yates,8.00%
Himrod,14842,Yates,8.00%
Dresden,14441,Yates,8.00%
Bellona,14415,Yates,8.00%
Lakemont,14857,Yates,8.00%
Monroe,10950,Orange,8.13%
Goshen,10924,Orange,8.13%
Middletown,10940,Orange,8.13%
Newburgh,12550,Orange,8.13%
Warwick,10990,Orange,8.13%
Florida,10921,Orange,8.13%
Chester,10918,Orange,8.13%
Washingtonville,10992,Orange,8.13%
Cornwall,12518,Orange,8.13%
Montgomery,12549,Orange,8.13%
Maybrook,12543,Orange,8.13%
Walden,12586,Orange,8.13%
Pine Bush,12566,Orange,8.13%
Port Jervis,12771,Orange,8.13%
Highland Falls,10928,Orange,8.13%
West Point,10996,Orange,8.13%
Central Valley,10917,Orange,8.13%
Harriman,10926,Orange,8.13%
Highland Mills,10930,Orange,8.13%
Slate Hill,10973,Orange,8.13%
Otisville,10963,Orange,8.13%
Bullville,10915,Orange,8.13%
Circleville,10919,Orange,8.13%
Cuddebackville,12729,Orange,8.13%
Howells,10932,Orange,8.13%
Johnson,10933,Orange,8.13%
New Hampton,10958,Orange,8.13%
Pine Island,10969,Orange,8.13%
Salisbury Mills,12577,Orange,8.13%
Sparrow Bush,12780,Orange,8.13%
Tuxedo Park,10987,Orange,8.13%
Unionville,10988,Orange,8.13%
Westtown,10998,Orange,8.13%
Barryville,12719,Sullivan,8.13%
Bethel,12720,Sullivan,8.13%
Bloomingburg,12721,Sullivan,8.13%
Callicoon,12723,Sullivan,8.13%
Claryville,12725,Sullivan,8.13%
Cochecton,12726,Sullivan,8.13%
East Branch,12724,Sullivan,8.13%
Fallsburg,12733,Sullivan,8.13%
Forestburgh,12777,Sullivan,8.13%
Glen Wild,12737,Sullivan,8.13%
Grahamsville,12740,Sullivan,8.13%
Hankins,12741,Sullivan,8.13%
Highland Lake,12743,Sullivan,8.13%
Hurleyville,12747,Sullivan,8.13%
Jeffersonville,12748,Sullivan,8.13%
Lake Huntington,12752,Sullivan,8.13%
Liberty,12754,Sullivan,8.13%
Livingston Manor,12758,Sullivan,8.13%
Long Eddy,12760,Sullivan,8.13%
Monticello,12701,Sullivan,8.13%
Narrowsburg,12764,Sullivan,8.13%
North Branch,12766,Sullivan,8.13%
Parksville,12768,Sullivan,8.13%
Roscoe,12776,Sullivan,8.13%
Rock Hill,12775,Sullivan,8.13%
Smallwood,12778,Sullivan,8.13%
Swan Lake,12783,Sullivan,8.13%
White Lake,12786,Sullivan,8.13%
Woodbourne,12788,Sullivan,8.13%
Wurtsboro,12790,Sullivan,8.13%
Yulan,12792,Sullivan,8.13%
Kiamesha Lake,12751,Sullivan,8.13%
Broadalbin,12025,Fulton,8.25%
Accord,12404,Ulster,8.13%
Arkville,12406,Ulster,8.13%
Bearsville,12409,Ulster,8.13%
Big Indian,12410,Ulster,8.13%
Bloomington,12411,Ulster,8.13%
Boiceville,12412,Ulster,8.13%
Chichester,12416,Ulster,8.13%
Clintondale,12515,Ulster,8.13%
Connelly,12417,Ulster,8.13%
Cottekill,12419,Ulster,8.13%
Cragsmoor,12420,Ulster,8.13%
Eddyville,12401,Ulster,8.13%
Ellenville,12428,Ulster,8.13%
Esopus,12429,Ulster,8.13%
Gardiner,12525,Ulster,8.13%
Glasco,12432,Ulster,8.13%
Glenford,12433,Ulster,8.13%
Greenfield Park,12435,Ulster,8.13%
High Falls,12440,Ulster,8.13%
Highland,12528,Ulster,8.13%
Highmount,12441,Ulster,8.13%
Hurley,12443,Ulster,8.13%
Kerhonkson,12446,Ulster,8.13%
Kingston,12401,Ulster,8.13%
Krumville,12461,Ulster,8.13%
Lake Hill,12448,Ulster,8.13%
Lake Katrine,12449,Ulster,8.13%
Lew Beach,12758,Ulster,8.13%
Malden-on-Hudson,12453,Ulster,8.13%
Marlborough,12542,Ulster,8.13%
Milton,12547,Ulster,8.13%
Modena,12548,Ulster,8.13%
Mount Marion,12456,Ulster,8.13%
Mount Tremper,12457,Ulster,8.13%
Napanoch,12458,Ulster,8.13%
New Paltz,12561,Ulster,8.13%
Olivebridge,12461,Ulster,8.13%
Oliverea,12410,Ulster,8.13%
Phoenicia,12464,Ulster,8.13%
Pine Hill,12465,Ulster,8.13%
Plattekill,12568,Ulster,8.13%
Port Ewen,12466,Ulster,8.13%
Rifton,12471,Ulster,8.13%
Rosendale,12472,Ulster,8.13%
Ruby,12475,Ulster,8.13%
Saint Remy,12401,Ulster,8.13%
Samsonville,12461,Ulster,8.13%
Saugerties,12477,Ulster,8.13%
Shady,12409,Ulster,8.13%
Shandaken,12480,Ulster,8.13%
Shokan,12481,Ulster,8.13%
Spring Glen,12483,Ulster,8.13%
Stone Ridge,12484,Ulster,8.13%
Sundown,12782,Ulster,8.13%
Tillson,12486,Ulster,8.13%
Ulster Park,12487,Ulster,8.13%
Walker Valley,12588,Ulster,8.13%
Wallkill,12589,Ulster,8.13%
Wawarsing,12489,Ulster,8.13%
West Camp,12490,Ulster,8.13%
West Hurley,12491,Ulster,8.13%
West Park,12493,Ulster,8.13%
West Shokan,12494,Ulster,8.13%
Willow,12495,Ulster,8.13%
Woodstock,12498,Ulster,8.13%
Caroga Lake,12032,Fulton,8.25%
Ephratah,13339,Fulton,8.25%
Fish House,12887,Fulton,8.25%
Gloversville,12078,Fulton,8.25%
Johnstown,12095,Fulton,8.25%
Mayfield,12117,Fulton,8.25%
Northville,12134,Fulton,8.25%
Perth,12138,Fulton,8.25%
Long Lake,12847,Hamilton,8.25%
Sabael,12864,Hamilton,8.25%
Hoffmeister,13353,Hamilton,8.25%
Inlet,13360,Hamilton,8.25%
Raquette Lake,13436,Hamilton,8.25%
Amsterdam,12010,Montgomery,8.25%
Canajoharie,13317,Montgomery,8.25%
Fonda,12068,Montgomery,8.25%
Fort Johnson,12070,Montgomery,8.25%
Fultonville,12072,Montgomery,8.25%
Hagaman,12086,Montgomery,8.25%
Nelliston,13410,Montgomery,8.25%
Palatine Bridge,13428,Montgomery,8.25%
St Johnsville,13452,Montgomery,8.25%
Tribes Hill,12177,Montgomery,8.25%
Burlington Flats,13315,Otsego,8.25%
Cherry Valley,13320,Otsego,8.25%
Cooperstown,13326,Otsego,8.25%
Edmeston,13335,Otsego,8.25%
Fly Creek,13337,Otsego,8.25%
Gilbertsville,13776,Otsego,8.25%
Hartwick,13348,Otsego,8.25%
Laurens,13796,Otsego,8.25%
Milford,13807,Otsego,8.25%
Morris,13808,Otsego,8.25%
Oneonta,13820,Otsego,8.25%
Otego,13825,Otsego,8.25%
Richfield Springs,13439,Otsego,8.25%
Roseboom,13450,Otsego,8.25%
Schenevus,12155,Otsego,8.25%
Unadilla,13849,Otsego,8.25%
Amenia,12501,Dutchess,8.38%
Arlington,12603,Dutchess,8.38%
Beacon,12508,Dutchess,8.38%
Clinton Corners,12514,Dutchess,8.38%
Dover Plains,12522,Dutchess,8.38%
East Fishkill,12533,Dutchess,8.38%
Fishkill,12524,Dutchess,8.38%
Hopewell Junction,12533,Dutchess,8.38%
Hyde Park,12538,Dutchess,8.38%
Lagrangeville,12540,Dutchess,8.38%
Millbrook,12545,Dutchess,8.38%
Millerton,12546,Dutchess,8.38%
Pawling,12564,Dutchess,8.38%
Poughkeepsie,12601,Dutchess,8.38%
Red Hook,12571,Dutchess,8.38%
Rhinebeck,12572,Dutchess,8.38%
Rhinecliff,12574,Dutchess,8.38%
Stanfordville,12581,Dutchess,8.38%
Tivoli,12583,Dutchess,8.38%
Wappingers Falls,12590,Dutchess,8.38%
Wingdale,12594,Dutchess,8.38%
Brewster,10509,Putnam,8.38%
Carmel,10512,Putnam,8.38%
Cold Spring,10516,Putnam,8.38%
Garrison,10524,Putnam,8.38%
Lake Peekskill,10537,Putnam,8.38%
Mahopac,10541,Putnam,8.38%
Mahopac Falls,10542,Putnam,8.38%
Patterson,12563,Putnam,8.38%
Putnam Valley,10579,Putnam,8.38%
Southeast,10509,Putnam,8.38%
Alfred,14802,Allegany,8.50%
Alfred Station,14803,Allegany,8.50%
Almond,14804,Allegany,8.50%
Andover,14806,Allegany,8.50%
Belmont,14813,Allegany,8.50%
Canaseraga,14822,Allegany,8.50%
Cuba,14727,Allegany,8.50%
Friendship,14739,Allegany,8.50%
Houghton,14744,Allegany,8.50%
Scio,14880,Allegany,8.50%
Wellsville,14895,Allegany,8.50%
Whitesville,14897,Allegany,8.50%
Avon,14414,Livingston,8.50%
Caledonia,14423,Livingston,8.50%
Conesus,14435,Livingston,8.50%
Dansville,14437,Livingston,8.50%
Geneseo,14454,Livingston,8.50%
Greigsville,14474,Livingston,8.50%
Groveland,14462,Livingston,8.50%
Leicester,14481,Livingston,8.50%
Lima,14485,Livingston,8.50%
Mount Morris,14510,Livingston,8.50%
Nunda,14517,Livingston,8.50%
Piffard,14533,Livingston,8.50%
Retsof,14539,Livingston,8.50%
Sonyea,14556,Livingston,8.50%
Springwater,14560,Livingston,8.50%
Addison,14801,Steuben,8.50%
Bath,14810,Steuben,8.50%
Bradford,14815,Steuben,8.50%
Campbell,14821,Steuben,8.50%
Canisteo,14823,Steuben,8.50%
Corning,14830,Steuben,8.50%
Hammondsport,14840,Steuben,8.50%
Hornell,14843,Steuben,8.50%
Jasper,14855,Steuben,8.50%
Painted Post,14870,Steuben,8.50%
Prattsburgh,14873,Steuben,8.50%
Savona,14879,Steuben,8.50%
Troupsburg,14885,Steuben,8.50%
Wayland,14572,Steuben,8.50%
Woodhull,14898,Steuben,8.50%
Olean,14760,Cattaraugus,8.75%
Salamanca,14779,Cattaraugus,8.75%
Allegany,14706,Cattaraugus,8.75%
Gowanda,14070,Cattaraugus,8.75%
Randolph,14772,Cattaraugus,8.75%
Franklinville,14737,Cattaraugus,8.75%
Delevan,14042,Cattaraugus,8.75%
Cattaraugus,14719,Cattaraugus,8.75%
Little Valley,14755,Cattaraugus,8.75%
Portville,14770,Cattaraugus,8.75%
Conewango Valley,14726,Cattaraugus,8.75%
South Dayton,14138,Cattaraugus,8.75%
Hinsdale,14743,Cattaraugus,8.75%
Machias,14101,Cattaraugus,8.75%
Great Valley,14741,Cattaraugus,8.75%
West Valley,14171,Cattaraugus,8.75%
Freedom,14065,Cattaraugus,8.75%
Saint Bonaventure,14778,Cattaraugus,8.75%
Perrysburg,14129,Cattaraugus,8.75%
Ellicottville,14731,Cattaraugus,8.75%
Limestone,14753,Cattaraugus,8.75%
East Otto,14729,Cattaraugus,8.75%
Kill Buck,14748,Cattaraugus,8.75%
Farmersville Station,14060,Cattaraugus,8.75%
Dayton,14041,Cattaraugus,8.75%
Yorkshire,14173,Cattaraugus,8.75%
Westons Mills,14788,Cattaraugus,8.75%
Steamburg,14783,Cattaraugus,8.75%
Versailles,14168,Cattaraugus,8.75%
Sandusky,14133,Cattaraugus,8.75%
East Randolph,14730,Cattaraugus,8.75%
Otto,14766,Cattaraugus,8.75%
Leon,14751,Cattaraugus,8.75%
Chaffee,14030,Cattaraugus,8.75%
Springville,14141,Cattaraugus,8.75%
Akron,14001,Erie,8.75%
Angola,14006,Erie,8.75%
Alden,14004,Erie,8.75%
Boston,14025,Erie,8.75%
Buffalo,14202,Erie,8.75%
Buffalo,14203,Erie,8.75%
Buffalo,14204,Erie,8.75%
Buffalo,14205,Erie,8.75%
Buffalo,14206,Erie,8.75%
Buffalo,14207,Erie,8.75%
Buffalo,14208,Erie,8.75%
Buffalo,14209,Erie,8.75%
Buffalo,14210,Erie,8.75%
Buffalo,14211,Erie,8.75%
Buffalo,14212,Erie,8.75%
Buffalo,14213,Erie,8.75%
Buffalo,14214,Erie,8.75%
Buffalo,14215,Erie,8.75%
Buffalo,14216,Erie,8.75%
Buffalo,14217,Erie,8.75%
Buffalo,14218,Erie,8.75%
Buffalo,14219,Erie,8.75%
Buffalo,14220,Erie,8.75%
Buffalo,14221,Erie,8.75%
Buffalo,14222,Erie,8.75%
Buffalo,14223,Erie,8.75%
Buffalo,14224,Erie,8.75%
Buffalo,14225,Erie,8.75%
Buffalo,14226,Erie,8.75%
Buffalo,14227,Erie,8.75%
Buffalo,14228,Erie,8.75%
Buffalo,14231,Erie,8.75%
Buffalo,14233,Erie,8.75%
Buffalo,14240,Erie,8.75%
Buffalo,14241,Erie,8.75%
Buffalo,14260,Erie,8.75%
Buffalo,14261,Erie,8.75%
Buffalo,14264,Erie,8.75%
Buffalo,14265,Erie,8.75%
Buffalo,14267,Erie,8.75%
Buffalo,14269,Erie,8.75%
Buffalo,14270,Erie,8.75%
Buffalo,14272,Erie,8.75%
Buffalo,14273,Erie,8.75%
Buffalo,14276,Erie,8.75%
Buffalo,14280,Erie,8.75%
Cheektowaga,14225,Erie,8.75%
Clarence,14031,Erie,8.75%
Colden,14033,Erie,8.75%
Collins,14034,Erie,8.75%
Depew,14043,Erie,8.75%
East Aurora,14052,Erie,8.75%
Eden,14057,Erie,8.75%
Elma,14059,Erie,8.75%
Grand Island,14072,Erie,8.75%
Hamburg,14075,Erie,8.75%
Holland,14080,Erie,8.75%
Lancaster,14086,Erie,8.75%
Lake View,14085,Erie,8.75%
Marilla,14102,Erie,8.75%
Orchard Park,14127,Erie,8.75%
Sardinia,14134,Erie,8.75%
Tonawanda,14150,Erie,8.75%
West Falls,14170,Erie,8.75%
Williamsville,14221,Erie,8.75%
Clayville,13322,Herkimer,8.75%
Cold Brook,13324,Herkimer,8.75%
Eagle Bay,13331,Herkimer,8.75%
Forestport,13338,Herkimer,8.75%
Frankfort,13340,Herkimer,8.75%
Herkimer,13350,Herkimer,8.75%
Ilion,13357,Herkimer,8.75%
Jordanville,13361,Herkimer,8.75%
Little Falls,13365,Herkimer,8.75%
Middleville,13406,Herkimer,8.75%
Mohawk,13407,Herkimer,8.75%
Newport,13416,Herkimer,8.75%
Old Forge,13420,Herkimer,8.75%
Poland,13431,Herkimer,8.75%
Salisbury Center,13454,Herkimer,8.75%
Thendara,13472,Herkimer,8.75%
Van Hornesville,13475,Herkimer,8.75%
West Winfield,13491,Herkimer,8.75%
Beaver Falls,13305,Lewis,8.75%
Castorland,13620,Lewis,8.75%
Constableville,13325,Lewis,8.75%
Copenhagen,13626,Lewis,8.75%
Croghan,13327,Lewis,8.75%
Glenfield,13343,Lewis,8.75%
Harrisville,13648,Lewis,8.75%
Harrisville,13649,Lewis,8.75%
Lowville,13367,Lewis,8.75%
Lyons Falls,13368,Lewis,8.75%
Martinsburg,13404,Lewis,8.75%
New Bremen,13367,Lewis,8.75%
Osceola,13437,Lewis,8.75%
Port Leyden,13433,Lewis,8.75%
Turin,13473,Lewis,8.75%
Watson,13685,Lewis,8.75%
Albion,13111,Oswego,8.75%
Altmar,13302,Oswego,8.75%
Boylston,13146,Oswego,8.75%
Central Square,13036,Oswego,8.75%
Cleveland,13042,Oswego,8.75%
Fulton,13069,Oswego,8.75%
Hannibal,13074,Oswego,8.75%
Hastings,13076,Oswego,8.75%
Mexico,13114,Oswego,8.75%
Minetto,13115,Oswego,8.75%
New Haven,13121,Oswego,8.75%
Oswego,13126,Oswego,8.75%
Oswego,13132,Oswego,8.75%
Parish,13131,Oswego,8.75%
Pulaski,13142,Oswego,8.75%
Richland,13144,Oswego,8.75%
Sandy Creek,13145,Oswego,8.75%
Schroeppel,13135,Oswego,8.75%
Williamstown,13493,Oswego,8.75%
Arcade,14009,Wyoming,8.75%
Attica,14011,Wyoming,8.75%
Bliss,14024,Wyoming,8.75%
Castile,14427,Wyoming,8.75%
Cowlesville,14037,Wyoming,8.75%
Eagle,14024,Wyoming,8.75%
Gainesville,14066,Wyoming,8.75%
Java Center,14082,Wyoming,8.75%
Java Village,14083,Wyoming,8.75%
Middlebury Center,14105,Wyoming,8.75%
North Java,14113,Wyoming,8.75%
Perry,14530,Wyoming,8.75%
Pike,14130,Wyoming,8.75%
Sheldon,14130,Wyoming,8.75%
Silver Springs,14550,Wyoming,8.75%
Strykersville,14145,Wyoming,8.75%
Warsaw,14569,Wyoming,8.75%
Wyoming,14591,Wyoming,8.75%
Airmont,10901,Rockland,8.75%
Blauvelt,10913,Rockland,8.75%
Chestnut Ridge,10977,Rockland,8.75%
Congers,10920,Rockland,8.75%
Garnerville,10923,Rockland,8.75%
Haverstraw,10927,Rockland,8.75%
Hillburn,10931,Rockland,8.75%
Montebello,10901,Rockland,8.75%
New City,10956,Rockland,8.75%
Nanuet,10954,Rockland,8.75%
Nyack,10960,Rockland,8.75%
Orangeburg,10962,Rockland,8.75%
Pearl River,10965,Rockland,8.75%
Piermont,10968,Rockland,8.75%
Pomona,10970,Rockland,8.75%
Sloatsburg,10974,Rockland,8.75%
Stony Point,10980,Rockland,8.75%
Suffern,10901,Rockland,8.75%
Tallman,10982,Rockland,8.75%
Tappan,10983,Rockland,8.75%
Thiells,10984,Rockland,8.75%
Upper Nyack,10965,Rockland,8.75%
Valley Cottage,10989,Rockland,8.75%
West Haverstraw,10993,Rockland,8.75%
West Nyack,10994,Rockland,8.75%
Amagansett,11930,Suffolk,8.75%
Aquebogue,11931,Suffolk,8.75%
Asharoken,11768,Suffolk,8.75%
Babylon,11702,Suffolk,8.75%
Bay Shore,11706,Suffolk,8.75%
Bayport,11705,Suffolk,8.75%
Bayville,11709,Suffolk,8.75%
Bellport,11713,Suffolk,8.75%
Blue Point,11715,Suffolk,8.75%
Bohemia,11716,Suffolk,8.75%
Brentwood,11717,Suffolk,8.75%
Bridgehampton,11932,Suffolk,8.75%
Brightwaters,11718,Suffolk,8.75%
Brookhaven,11719,Suffolk,8.75%
Calverton,11933,Suffolk,8.75%
Center Moriches,11934,Suffolk,8.75%
Centerport,11721,Suffolk,8.75%
Central Islip,11722,Suffolk,8.75%
Cold Spring Harbor,11724,Suffolk,8.75%
Commack,11725,Suffolk,8.75%
Copiague,11726,Suffolk,8.75%
Coram,11727,Suffolk,8.75%
Cutchogue,11935,Suffolk,8.75%
Deer Park,11729,Suffolk,8.75%
East Hampton,11937,Suffolk,8.75%
East Islip,11730,Suffolk,8.75%
East Marion,11939,Suffolk,8.75%
East Moriches,11940,Suffolk,8.75%
East Northport,11731,Suffolk,8.75%
East Quogue,11942,Suffolk,8.75%
East Setauket,11733,Suffolk,8.75%
Eastport,11941,Suffolk,8.75%
Farmingville,11738,Suffolk,8.75%
Fire Island,11770,Suffolk,8.75%
Greenlawn,11740,Suffolk,8.75%
Greenport,11944,Suffolk,8.75%
Hampton Bays,11946,Suffolk,8.75%
Hauppauge,11788,Suffolk,8.75%
Huntington,11743,Suffolk,8.75%
Huntington Station,11746,Suffolk,8.75%
Kings Park,11754,Suffolk,8.75%
Lake Grove,11755,Suffolk,8.75%
Lake Panamoka,11779,Suffolk,8.75%
Laurel,11948,Suffolk,8.75%
Lindenhurst,11757,Suffolk,8.75%
Lloyd Harbor,11743,Suffolk,8.75%
Manorville,11949,Suffolk,8.75%
Mattituck,11952,Suffolk,8.75%
Medford,11763,Suffolk,8.75%
Middle Island,11953,Suffolk,8.75%
Miller Place,11764,Suffolk,8.75%
Montauk,11954,Suffolk,8.75%
Mount Sinai,11766,Suffolk,8.75%
Nesconset,11767,Suffolk,8.75%
North Babylon,11703,Suffolk,8.75%
Northport,11768,Suffolk,8.75%
Oakdale,11769,Suffolk,8.75%
Orient,11957,Suffolk,8.75%
Patchogue,11772,Suffolk,8.75%
Peconic,11958,Suffolk,8.75%
Port Jefferson,11777,Suffolk,8.75%
Riverhead,11901,Suffolk,8.75%
Rocky Point,11778,Suffolk,8.75%
Sag Harbor,11963,Suffolk,8.75%
Sagaponack,11962,Suffolk,8.75%
Sayville,11782,Suffolk,8.75%
Shelter Island,11964,Suffolk,8.75%
Shirley,11967,Suffolk,8.75%
Smithtown,11787,Suffolk,8.75%
Southampton,11968,Suffolk,8.75%
Southold,11971,Suffolk,8.75%
St. James,11780,Suffolk,8.75%
Stony Brook,11790,Suffolk,8.75%
Wading River,11792,Suffolk,8.75%
Westhampton,11977,Suffolk,8.75%
Westhampton Beach,11978,Suffolk,8.75%
West Islip,11795,Suffolk,8.75%
Wyandanch,11798,Suffolk,8.75%
Yaphank,11980,Suffolk,8.75%
Bronx,10451,New York Tax - Bronx,8.88%
Bronx,10452,New York Tax - Bronx,8.88%
Bronx,10453,New York Tax - Bronx,8.88%
Bronx,10454,New York Tax - Bronx,8.88%
Bronx,10455,New York Tax - Bronx,8.88%
Bronx,10456,New York Tax - Bronx,8.88%
Bronx,10457,New York Tax - Bronx,8.88%
Bronx,10458,New York Tax - Bronx,8.88%
Bronx,10459,New York Tax - Bronx,8.88%
Bronx,10460,New York Tax - Bronx,8.88%
Bronx,10461,New York Tax - Bronx,8.88%
Bronx,10462,New York Tax - Bronx,8.88%
Bronx,10463,New York Tax - Bronx,8.88%
Bronx,10464,New York Tax - Bronx,8.88%
Bronx,10465,New York Tax - Bronx,8.88%
Bronx,10466,New York Tax - Bronx,8.88%
Bronx,10467,New York Tax - Bronx,8.88%
Bronx,10468,New York Tax - Bronx,8.88%
Bronx,10469,New York Tax - Bronx,8.88%
Bronx,10470,New York Tax - Bronx,8.88%
Bronx,10471,New York Tax - Bronx,8.88%
Bronx,10472,New York Tax - Bronx,8.88%
Bronx,10473,New York Tax - Bronx,8.88%
Bronx,10474,New York Tax - Bronx,8.88%
Bronx,10475,New York Tax - Bronx,8.88%
Brooklyn,11203,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11204,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11205,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11206,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11207,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11208,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11209,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11210,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11211,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11212,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11213,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11214,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11215,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11216,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11217,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11218,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11219,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11220,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11221,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11222,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11223,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11224,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11225,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11226,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11228,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11229,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11230,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11231,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11232,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11233,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11234,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11235,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11236,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11237,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11238,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11239,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11240,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11241,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11242,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11243,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11247,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11249,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11251,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11252,New York Tax - Kings (Brooklyn),8.88%
Brooklyn,11256,New York Tax - Kings (Brooklyn),8.88%
Albertson,11507,Nassau,8.88%
Baldwin,11510,Nassau,8.88%
Bayville,11709,Nassau,8.88%
Bellmore,11710,Nassau,8.88%
Carle Place,11514,Nassau,8.88%
Cedarhurst,11516,Nassau,8.88%
East Meadow,11554,Nassau,8.88%
East Rockaway,11518,Nassau,8.88%
East Williston,11548,Nassau,8.88%
Elmont,11003,Nassau,8.88%
Farmingdale,11735,Nassau,8.88%
Floral Park,11001,Nassau,8.88%
Franklin Square,11010,Nassau,8.88%
Freeport,11520,Nassau,8.88%
Garden City,11530,Nassau,8.88%
Glen Cove,11542,Nassau,8.88%
Glen Head,11545,Nassau,8.88%
Great Neck,11021,Nassau,8.88%
Hempstead,11550,Nassau,8.88%
Hewlett,11557,Nassau,8.88%
Hicksville,11801,Nassau,8.88%
Inwood,11096,Nassau,8.88%
Island Park,11558,Nassau,8.88%
Jericho,11753,Nassau,8.88%
Lawrence,11559,Nassau,8.88%
Levittown,11756,Nassau,8.88%
Lido Beach,11561,Nassau,8.88%
Long Beach,11561,Nassau,8.88%
Lynbrook,11563,Nassau,8.88%
Massapequa,11758,Nassau,8.88%
Massapequa Park,11762,Nassau,8.88%
Merrick,11566,Nassau,8.88%
Mineola,11501,Nassau,8.88%
New Hyde Park,11040,Nassau,8.88%
Oceanside,11572,Nassau,8.88%
Old Bethpage,11804,Nassau,8.88%
Oyster Bay,11771,Nassau,8.88%
Plainview,11803,Nassau,8.88%
Port Washington,11050,Nassau,8.88%
Rockville Centre,11570,Nassau,8.88%
Roslyn,11576,Nassau,8.88%
Seaford,11783,Nassau,8.88%
Syosset,11791,Nassau,8.88%
Uniondale,11553,Nassau,8.88%
Valley Stream,11580,Nassau,8.88%
Wantagh,11793,Nassau,8.88%
Westbury,11568,Nassau,8.88%
Williston Park,11596,Nassau,8.88%
Woodbury,11797,Nassau,8.88%
New York,10002,New York,8.88%
New York,10003,New York,8.88%
New York,10004,New York,8.88%
New York,10005,New York,8.88%
New York,10006,New York,8.88%
New York,10007,New York,8.88%
New York,10009,New York,8.88%
New York,10010,New York,8.88%
New York,10011,New York,8.88%
New York,10012,New York,8.88%
New York,10013,New York,8.88%
New York,10014,New York,8.88%
New York,10016,New York,8.88%
New York,10017,New York,8.88%
New York,10018,New York,8.88%
New York,10019,New York,8.88%
New York,10020,New York,8.88%
New York,10021,New York,8.88%
New York,10022,New York,8.88%
New York,10023,New York,8.88%
New York,10024,New York,8.88%
New York,10025,New York,8.88%
New York,10026,New York,8.88%
New York,10027,New York,8.88%
New York,10028,New York,8.88%
New York,10029,New York,8.88%
New York,10030,New York,8.88%
New York,10031,New York,8.88%
New York,10032,New York,8.88%
New York,10033,New York,8.88%
New York,10034,New York,8.88%
New York,10035,New York,8.88%
New York,10036,New York,8.88%
New York,10037,New York,8.88%
New York,10038,New York,8.88%
New York,10039,New York,8.88%
New York,10040,New York,8.88%
New York,10044,New York,8.88%
New York,10065,New York,8.88%
New York,10069,New York,8.88%
New York,10075,New York,8.88%
New York,10128,New York,8.88%
Queens,11004,New York Tax -  Queens,8.88%
Queens,11005,New York Tax -  Queens,8.88%
Queens,11101,New York Tax -  Queens,8.88%
Queens,11102,New York Tax -  Queens,8.88%
Queens,11103,New York Tax -  Queens,8.88%
Queens,11104,New York Tax -  Queens,8.88%
Queens,11105,New York Tax -  Queens,8.88%
Queens,11106,New York Tax -  Queens,8.88%
Queens,11109,New York Tax -  Queens,8.88%
Queens,11354,New York Tax -  Queens,8.88%
Queens,11355,New York Tax -  Queens,8.88%
Queens,11356,New York Tax -  Queens,8.88%
Queens,11357,New York Tax -  Queens,8.88%
Queens,11358,New York Tax -  Queens,8.88%
Queens,11359,New York Tax -  Queens,8.88%
Queens,11360,New York Tax -  Queens,8.88%
Queens,11361,New York Tax -  Queens,8.88%
Queens,11362,New York Tax -  Queens,8.88%
Queens,11363,New York Tax -  Queens,8.88%
Queens,11364,New York Tax -  Queens,8.88%
Queens,11365,New York Tax -  Queens,8.88%
Queens,11366,New York Tax -  Queens,8.88%
Queens,11367,New York Tax -  Queens,8.88%
Queens,11368,New York Tax -  Queens,8.88%
Queens,11369,New York Tax -  Queens,8.88%
Queens,11370,New York Tax -  Queens,8.88%
Queens,11372,New York Tax -  Queens,8.88%
Queens,11373,New York Tax -  Queens,8.88%
Queens,11374,New York Tax -  Queens,8.88%
Queens,11375,New York Tax -  Queens,8.88%
Queens,11377,New York Tax -  Queens,8.88%
Queens,11378,New York Tax -  Queens,8.88%
Queens,11379,New York Tax -  Queens,8.88%
Queens,11385,New York Tax -  Queens,8.88%
Queens,11411,New York Tax -  Queens,8.88%
Queens,11412,New York Tax -  Queens,8.88%
Queens,11413,New York Tax -  Queens,8.88%
Queens,11414,New York Tax -  Queens,8.88%
Queens,11415,New York Tax -  Queens,8.88%
Queens,11416,New York Tax -  Queens,8.88%
Queens,11417,New York Tax -  Queens,8.88%
Queens,11418,New York Tax -  Queens,8.88%
Queens,11419,New York Tax -  Queens,8.88%
Queens,11420,New York Tax -  Queens,8.88%
Queens,11421,New York Tax -  Queens,8.88%
Queens,11422,New York Tax -  Queens,8.88%
Queens,11423,New York Tax -  Queens,8.88%
Queens,11426,New York Tax -  Queens,8.88%
Queens,11427,New York Tax -  Queens,8.88%
Queens,11428,New York Tax -  Queens,8.88%
Queens,11429,New York Tax -  Queens,8.88%
Queens,11432,New York Tax -  Queens,8.88%
Queens,11433,New York Tax -  Queens,8.88%
Queens,11434,New York Tax -  Queens,8.88%
Queens,11435,New York Tax -  Queens,8.88%
Queens,11436,New York Tax -  Queens,8.88%
Queens,11691,New York Tax -  Queens,8.88%
Queens,11692,New York Tax -  Queens,8.88%
Queens,11693,New York Tax -  Queens,8.88%
Queens,11694,New York Tax -  Queens,8.88%
Queens,11695,New York Tax -  Queens,8.88%
Queens,11697,New York Tax -  Queens,8.88%
Staten Island,10301,New York Tax - Richmond (Staten Island),8.88%
Staten Island,10302,New York Tax - Richmond (Staten Island),8.88%
Staten Island,10303,New York Tax - Richmond (Staten Island),8.88%
Staten Island,10304,New York Tax - Richmond (Staten Island),8.88%
Staten Island,10305,New York Tax - Richmond (Staten Island),8.88%
Staten Island,10306,New York Tax - Richmond (Staten Island),8.88%
Staten Island,10307,New York Tax - Richmond (Staten Island),8.88%
Staten Island,10308,New York Tax - Richmond (Staten Island),8.88%
Staten Island,10309,New York Tax - Richmond (Staten Island),8.88%
Staten Island,10310,New York Tax - Richmond (Staten Island),8.88%
Staten Island,10311,New York Tax - Richmond (Staten Island),8.88%
Staten Island,10312,New York Tax - Richmond (Staten Island),8.88%
Staten Island,10313,New York Tax - Richmond (Staten Island),8.88%
Staten Island,10314,New York Tax - Richmond (Staten Island),8.88%
Amawalk,10501,New York Tax - Westchester,8.88%
Ardsley,10502,New York Tax - Westchester,8.88%
Armonk,10504,New York Tax - Westchester,8.88%
Baldwin Place,10505,New York Tax - Westchester,8.88%
Bedford,10506,New York Tax - Westchester,8.88%
Bedford Hills,10507,New York Tax - Westchester,8.88%
Briarcliff Manor,10510,New York Tax - Westchester,8.88%
Buchanan,10511,New York Tax - Westchester,8.88%
Chappaqua,10514,New York Tax - Westchester,8.88%
Crompond,10517,New York Tax - Westchester,8.88%
Cross River,10518,New York Tax - Westchester,8.88%
Croton Falls,10519,New York Tax - Westchester,8.88%
Croton-on-Hudson,10520,New York Tax - Westchester,8.88%
Dobbs Ferry,10522,New York Tax - Westchester,8.88%
Elmsford,10523,New York Tax - Westchester,8.88%
Goldens Bridge,10526,New York Tax - Westchester,8.88%
Granite Springs,10527,New York Tax - Westchester,8.88%
Harrison,10528,New York Tax - Westchester,8.88%
Hartsdale,10530,New York Tax - Westchester,8.88%
Hawthorne,10532,New York Tax - Westchester,8.88%
Irvington,10533,New York Tax - Westchester,8.88%
Jefferson Valley,10535,New York Tax - Westchester,8.88%
Katonah,10536,New York Tax - Westchester,8.88%
Larchmont,10538,New York Tax - Westchester,8.88%
Lewisboro,10540,New York Tax - Westchester,8.88%
Mount Kisco,10549,New York Tax - Westchester,8.88%
Mount Vernon,10550,New York Tax - Westchester,8.88%
Mamaroneck,10543,New York Tax - Westchester,8.88%
New Rochelle,10801,New York Tax - Westchester,8.88%
North Salem,10560,New York Tax - Westchester,8.88%
Ossining,10562,New York Tax - Westchester,8.88%
Peekskill,10566,New York Tax - Westchester,8.88%
Pelham,10803,New York Tax - Westchester,8.88%
Pleasantville,10570,New York Tax - Westchester,8.88%
Port Chester,10573,New York Tax - Westchester,8.88%
Purchase,10577,New York Tax - Westchester,8.88%
Rye,10580,New York Tax - Westchester,8.88%
Scarsdale,10583,New York Tax - Westchester,8.88%
Sleepy Hollow,10591,New York Tax - Westchester,8.88%
Somers,10589,New York Tax - Westchester,8.88%
Tarrytown,10591,New York Tax - Westchester,8.88%
Thornwood,10594,New York Tax - Westchester,8.88%
Valhalla,10595,New York Tax - Westchester,8.88%
White Plains,10601,New York Tax - Westchester,8.88%
Yonkers,10701,New York Tax - Westchester,8.88%
Yonkers,10703,New York Tax - Westchester,8.88%
Yonkers,10704,New York Tax - Westchester,8.88%
Yonkers,10705,New York Tax - Westchester,8.88%
Yonkers,10706,New York Tax - Westchester,8.88%
Yonkers,10707,New York Tax - Westchester,8.88%
Yonkers,10708,New York Tax - Westchester,8.88%
Yonkers,10709,New York Tax - Westchester,8.88%
Yonkers,10710,New York Tax - Westchester,8.88%
Bedford,10546,New York Tax - Westchester,8.88%
Briarcliff Manor,10510,New York Tax - Westchester,8.88%
Bronxville,10708,New York Tax - Westchester,8.88%
Cortlandt Manor,10567,New York Tax - Westchester,8.88%
Eastchester,10709,New York Tax - Westchester,8.88%
Hastings-on-Hudson,10706,New York Tax - Westchester,8.88%
Mamaroneck,10543,New York Tax - Westchester,8.88%
Mount Pleasant,10594,New York Tax - Westchester,8.88%
New Castle,10514,New York Tax - Westchester,8.88%
Pelham Manor,10803,New York Tax - Westchester,8.88%
Rye Brook,10573,New York Tax - Westchester,8.88%
Scarsdale,10583,New York Tax - Westchester,8.88%
Yorktown Heights,10598,New York Tax - Westchester,8.88%
Alabama,14013,Genesee,8.75%
Oakfield,14125,Genesee,8.75%
Alexander,14005,Genesee,8.75%
Batavia City,14020,Genesee,8.75%
Bergen,14416,Genesee,8.75%
Bethany,14054,Genesee,8.75%
Byron,14422,Genesee,8.75%
Darien,14040,Genesee,8.75%
Elba,14058,Genesee,8.75%
Le Roy,14482,Genesee,8.75%
Pavilion,14525,Genesee,8.75%
Pembroke,14036,Genesee,8.75%
Stafford,14143,Genesee,8.75%
Village of Alexander,14005,Genesee,8.75%
Village of Bergen,14416,Genesee,8.75%
Village of Corfu,14036,Genesee,8.75%
Village of Elba,14058,Genesee,8.75%
Village of Le Roy,14482,Genesee,8.75%
Village of Oakfield,14125,Genesee,8.75%`;

// Parsed lookup index: Map of 5-digit ZIP to NyTaxEntry
export const NY_ZIP_TAX_MAP = new Map<string, NyTaxEntry>();
export const ALL_NY_TAX_ENTRIES: NyTaxEntry[] = [];

// Parse on module load
(() => {
  const lines = NY_TAX_RAW_CSV.trim().split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length >= 4) {
      const city = parts[0].trim();
      const zipRaw = parts[1].trim();
      const county = parts[2].trim();
      const rateStr = parts[3].trim().replace('%', '');
      const ratePercent = parseFloat(rateStr);
      const rateDecimal = Math.round((ratePercent / 100 + Number.EPSILON) * 100000) / 100000;
      // Handle entries like "14013 / 14125"
      const zips = zipRaw.split('/').map(z => z.trim().padStart(5, '0'));
      for (const z of zips) {
        if (/^\d{5}$/.test(z)) {
          const entry: NyTaxEntry = {
            city,
            zip: z,
            county,
            ratePercent,
            rateDecimal,
          };
          NY_ZIP_TAX_MAP.set(z, entry);
          ALL_NY_TAX_ENTRIES.push(entry);
        }
      }
    }
  }
})();

export interface ResolvedTaxInfo {
  rate: number;
  ratePercentFormatted: string;
  jurisdiction: string;
  isTaxExempt: boolean;
  state: string;
  county?: string;
  city?: string;
}

/**
 * Authoritative Tax Resolution Rule:
 * 1. If tax_exempt is true: Rate is 0% ($0.00).
 * 2. If state is NJ: Rate is 3.31259% (0.0331259) - NJ Urban Enterprise Zone / State Rate.
 * 3. If state is NY:
 *    - Looks up ZIP code in the NY Tax sheet.
 *    - If found: returns exact rate (e.g., 8.88% in NYC/Westchester/Nassau, 8.75% in Rockland/Erie, 8.00% upstate).
 *    - If NY ZIP not found: fallback to 8.00% (baseline NY state + local rate).
 * 4. Other US States (PA, CT, FL, TX, etc.): 0.00% (No sales tax for now).
 */
export function resolveTaxRate(
  state?: string | null,
  zip?: string | null,
  taxExempt?: boolean
): ResolvedTaxInfo {
  if (taxExempt) {
    return {
      rate: 0,
      ratePercentFormatted: '0.00%',
      jurisdiction: 'Tax Exempt Customer (ST-3 / Certificate on File)',
      isTaxExempt: true,
      state: state || 'NJ',
    };
  }

  const cleanState = (state || '').trim().toUpperCase();
  const cleanZip = (zip || '').trim().slice(0, 5).padStart(5, '0');

  // NJ Rule: Fixed 3.31259%
  if (cleanState === 'NJ') {
    return {
      rate: 0.0331259,
      ratePercentFormatted: '3.31259%',
      jurisdiction: 'New Jersey (3.31259% UEZ/State Sales Tax)',
      isTaxExempt: false,
      state: 'NJ',
    };
  }

  // NY Rule: Varies depending on ZIP Code
  if (cleanState === 'NY') {
    const nyMatch = NY_ZIP_TAX_MAP.get(cleanZip);
    if (nyMatch) {
      return {
        rate: nyMatch.rateDecimal,
        ratePercentFormatted: `${nyMatch.ratePercent.toFixed(2)}%`,
        jurisdiction: `New York - ${nyMatch.county} (${nyMatch.ratePercent.toFixed(2)}%)`,
        isTaxExempt: false,
        state: 'NY',
        county: nyMatch.county,
        city: nyMatch.city,
      };
    }
    // Default NY fallback if valid 5-digit NY ZIP outside table
    return {
      rate: 0.08,
      ratePercentFormatted: '8.00%',
      jurisdiction: 'New York State Standard (8.00%)',
      isTaxExempt: false,
      state: 'NY',
    };
  }

  // Other US States: No sales tax for now
  if (cleanState && cleanState !== 'NJ' && cleanState !== 'NY') {
    return {
      rate: 0,
      ratePercentFormatted: '0.00%',
      jurisdiction: `Out of State (${cleanState} - 0.00% Sales Tax)`,
      isTaxExempt: false,
      state: cleanState,
    };
  }

  // If state is not provided, default to NJ since store is located in Union City, NJ
  return {
    rate: 0.0331259,
    ratePercentFormatted: '3.31259%',
    jurisdiction: 'New Jersey (3.31259% Default Store Tax)',
    isTaxExempt: false,
    state: 'NJ',
  };
}
