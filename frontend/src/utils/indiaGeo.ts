/**
 * All-India State / UT + District directory for the Executive DSS.
 * Used to populate Global MIS filters, States Performance and Districts MIS.
 * District lists follow State revenue department notifications as of 2024.
 * (Rajasthan's post-2023 notified districts roll up to their parent districts
 * in this demo directory.)
 */

export interface IndiaState {
  name: string;
  code: string;
  type: "State" | "UT";
}

export const INDIA_STATES: IndiaState[] = [
  { name: "Andaman and Nicobar Islands", code: "AN", type: "UT" },
  { name: "Andhra Pradesh", code: "AP", type: "State" },
  { name: "Arunachal Pradesh", code: "AR", type: "State" },
  { name: "Assam", code: "AS", type: "State" },
  { name: "Bihar", code: "BR", type: "State" },
  { name: "Chandigarh", code: "CH", type: "UT" },
  { name: "Chhattisgarh", code: "CG", type: "State" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "DN", type: "UT" },
  { name: "Delhi", code: "DL", type: "UT" },
  { name: "Goa", code: "GA", type: "State" },
  { name: "Gujarat", code: "GJ", type: "State" },
  { name: "Haryana", code: "HR", type: "State" },
  { name: "Himachal Pradesh", code: "HP", type: "State" },
  { name: "Jammu and Kashmir", code: "JK", type: "UT" },
  { name: "Jharkhand", code: "JH", type: "State" },
  { name: "Karnataka", code: "KA", type: "State" },
  { name: "Kerala", code: "KL", type: "State" },
  { name: "Ladakh", code: "LA", type: "UT" },
  { name: "Lakshadweep", code: "LD", type: "UT" },
  { name: "Madhya Pradesh", code: "MP", type: "State" },
  { name: "Maharashtra", code: "MH", type: "State" },
  { name: "Manipur", code: "MN", type: "State" },
  { name: "Meghalaya", code: "ML", type: "State" },
  { name: "Mizoram", code: "MZ", type: "State" },
  { name: "Nagaland", code: "NL", type: "State" },
  { name: "Odisha", code: "OD", type: "State" },
  { name: "Puducherry", code: "PY", type: "UT" },
  { name: "Punjab", code: "PB", type: "State" },
  { name: "Rajasthan", code: "RJ", type: "State" },
  { name: "Sikkim", code: "SK", type: "State" },
  { name: "Tamil Nadu", code: "TN", type: "State" },
  { name: "Telangana", code: "TG", type: "State" },
  { name: "Tripura", code: "TR", type: "State" },
  { name: "Uttar Pradesh", code: "UP", type: "State" },
  { name: "Uttarakhand", code: "UK", type: "State" },
  { name: "West Bengal", code: "WB", type: "State" },
];

/** District names keyed by State / UT name. */
export const INDIA_DISTRICTS: Record<string, string[]> = {
  "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
  "Andhra Pradesh": [
    "Alluri Sitharama Raju", "Anakapalli", "Anantapur", "Annamayya", "Bapatla",
    "Chittoor", "East Godavari", "Eluru", "Guntur", "Kadapa (YSR)", "Kakinada",
    "Konaseema", "Krishna", "Kurnool", "Nandyal", "Nellore (SPSR Nellore)", "NTR",
    "Palnadu", "Parvathipuram Manyam", "Prakasam", "Srikakulam", "Sri Sathya Sai",
    "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari",
  ],
  "Arunachal Pradesh": [
    "Anjaw", "Bichom", "Changlang", "Dibang Valley", "East Kameng", "East Siang",
    "Itanagar Capital Complex", "Kamle", "Keyi Panyor", "Kra Daadi", "Kurung Kumey",
    "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang",
    "Lower Subansiri", "Namsai", "Pakke-Kessang", "Papum Pare", "Shi-Yomi", "Siang",
    "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang",
  ],
  Assam: [
    "Baksa", "Bajali", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo",
    "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara",
    "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan",
    "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon",
    "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar",
    "Tamulpur", "Tinsukia", "Udalguri", "West Karbi Anglong",
  ],
  Bihar: [
    "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur",
    "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad",
    "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura",
    "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia",
    "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi",
    "Siwan", "Supaul", "Vaishali", "West Champaran",
  ],
  Chandigarh: ["Chandigarh"],
  Chhattisgarh: [
    "Balod", "Baloda Bazar", "Balrampur-Ramanujganj", "Bastar", "Bemetara", "Bijapur",
    "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi",
    "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Khairagarh-Chhuikhadan-Gandai",
    "Kondagaon", "Korba", "Koriya", "Mahasamund", "Manendragarh-Chirmiri-Bharatpur",
    "Mohla-Manpur-Ambagarh Chowki", "Mungeli", "Narayanpur", "Raigarh", "Raipur",
    "Rajnandgaon", "Sakti", "Sarangarh-Bilaigarh", "Sukma", "Surajpur", "Surguja",
  ],
  "Dadra and Nagar Haveli and Daman and Diu": ["Dadra and Nagar Haveli", "Daman", "Diu"],
  Delhi: [
    "Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi",
    "North West Delhi", "Shahdara", "South Delhi", "South East Delhi",
    "South West Delhi", "West Delhi",
  ],
  Goa: ["North Goa", "South Goa"],
  Gujarat: [
    "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar",
    "Botad", "Chhota Udepur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar",
    "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana",
    "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot",
    "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad", "Vav-Tharad",
  ],
  Haryana: [
    "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram",
    "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh",
    "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat",
    "Yamunanagar",
  ],
  "Himachal Pradesh": [
    "Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu",
    "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una",
  ],
  "Jammu and Kashmir": [
    "Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu",
    "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri",
    "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur",
  ],
  Jharkhand: [
    "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa",
    "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma",
    "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahebganj",
    "Seraikela-Kharsawan", "Simdega", "West Singhbhum",
  ],
  Karnataka: [
    "Bagalkote", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar",
    "Chamarajanagara", "Chikballapur", "Chikkamagaluru", "Chitradurga",
    "Dakshina Kannada", "Davangere", "Dharwad", "Gadag", "Hassan", "Haveri",
    "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur",
    "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada",
    "Vijayanagara", "Vijayapura", "Yadgir",
  ],
  Kerala: [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam",
    "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram",
    "Thrissur", "Wayanad",
  ],
  Ladakh: ["Kargil", "Leh"],
  Lakshadweep: ["Lakshadweep"],
  "Madhya Pradesh": [
    "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani",
    "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh",
    "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Indore",
    "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Maihar", "Mandla",
    "Mandsaur", "Mauganj", "Morena", "Narmadapuram", "Narsinghpur", "Neemuch",
    "Niwari", "Pandhurna", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar",
    "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri",
    "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha",
  ],
  Maharashtra: [
    "Ahmednagar (Ahilyanagar)", "Akola", "Amravati",
    "Aurangabad (Chhatrapati Sambhajinagar)", "Beed", "Bhandara", "Buldhana",
    "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna",
    "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded",
    "Nandurbar", "Nashik", "Osmanabad (Dharashiv)", "Palghar", "Parbhani", "Pune",
    "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane",
    "Wardha", "Washim", "Yavatmal",
  ],
  Manipur: [
    "Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam",
    "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati",
    "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul",
  ],
  Meghalaya: [
    "East Garo Hills", "East Jaintia Hills", "East Khasi Hills",
    "Eastern West Khasi Hills", "North Garo Hills", "Ri-Bhoi", "South Garo Hills",
    "South West Garo Hills", "South West Khasi Hills", "West Garo Hills",
    "West Jaintia Hills", "West Khasi Hills",
  ],
  Mizoram: [
    "Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai",
    "Lunglei", "Mamit", "Saiha", "Saitual", "Serchhip",
  ],
  Nagaland: [
    "Chümoukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon",
    "Niuland", "Noklak", "Peren", "Phek", "Shamator", "Tseminyü", "Tuensang",
    "Wokha", "Zunheboto",
  ],
  Odisha: [
    "Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack",
    "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur",
    "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha",
    "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada",
    "Puri", "Rayagada", "Sambalpur", "Sonepur", "Sundargarh",
  ],
  Puducherry: ["Karaikal", "Mahe", "Puducherry", "Yanam"],
  Punjab: [
    "Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka",
    "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana",
    "Malerkotla", "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala",
    "Rupnagar", "Sangrur", "SAS Nagar (Mohali)", "SBS Nagar (Nawanshahr)",
    "Tarn Taran",
  ],
  Rajasthan: [
    "Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara",
    "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur",
    "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu",
    "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand",
    "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur",
  ],
  Sikkim: ["Gangtok", "Gyalshing", "Mangan", "Namchi", "Pakyong", "Soreng"],
  "Tamil Nadu": [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
    "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Kanniyakumari", "Karur",
    "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal",
    "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem",
    "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli",
    "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai",
    "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar",
  ],
  Telangana: [
    "Adilabad", "Bhadradri Kothagudem", "Hanamkonda", "Hyderabad", "Jagtial",
    "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy",
    "Karimnagar", "Khammam", "Komaram Bheem Asifabad", "Mahabubabad",
    "Mahabubnagar", "Mancherial", "Medak", "Medchal-Malkajgiri", "Mulugu",
    "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli",
    "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet",
    "Vikarabad", "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri",
  ],
  Tripura: [
    "Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura",
    "Unakoti", "West Tripura",
  ],
  "Uttar Pradesh": [
    "Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya",
    "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki",
    "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli",
    "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad",
    "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur",
    "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj",
    "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kushinagar",
    "Lakhimpur Kheri", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri",
    "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit",
    "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal",
    "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar",
    "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi",
  ],
  Uttarakhand: [
    "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar",
    "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal",
    "Udham Singh Nagar", "Uttarkashi",
  ],
  "West Bengal": [
    "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur",
    "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong",
    "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas",
    "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur",
    "Purulia", "South 24 Parganas", "Uttar Dinajpur",
  ],
};

/** Flat list of { district, state } for search. */
export interface DistrictEntry {
  district: string;
  state: string;
}

export const ALL_DISTRICTS: DistrictEntry[] = Object.entries(INDIA_DISTRICTS).flatMap(
  ([state, list]) => list.map((district) => ({ district, state })),
);

export const TOTAL_DISTRICTS = ALL_DISTRICTS.length;
