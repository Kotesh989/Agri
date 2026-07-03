// Comprehensive Indian location dataset for South India
export const LOCATIONS = {
  countries: ['India'],
  
  states: {
    'India': ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Maharashtra']
  },
  
  districts: {
    'Karnataka': ['Bangalore Urban', 'Mandya', 'Mysore', 'Kolar', 'Tumkur', 'Hassan', 'Shimoga', 'Belagavi'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
    'Andhra Pradesh': ['Krishna', 'Guntur', 'Kurnool'],
    'Maharashtra': ['Pune', 'Mumbai', 'Nagpur']
  },
  
  taluks: {
    'Bangalore Urban': ['Bangalore North', 'Bangalore South', 'Bangalore East', 'Bangalore West'],
    'Mandya': ['Mandya', 'Maddur', 'Malavalli', 'Pandavapura', 'Srirangapatna', 'K.R. Pet', 'Nagamangala'],
    'Mysore': ['Mysore', 'Nanjangud', 'T. Narasipura', 'H.D. Kote', 'Hunsur', 'K.R. Nagar', 'Piriyapatna'],
    'Kolar': ['Kolar', 'Bangarapet', 'Malur', 'Mulbagal', 'Srinivaspur'],
    'Tumkur': ['Tumkur', 'Gubbi', 'Kunigal', 'Sira', 'Tiptur'],
    'Hassan': ['Hassan', 'Alur', 'Belur', 'Channarayapatna', 'Holenarasipura'],
    'Shimoga': ['Shimoga', 'Bhadravathi', 'Sagar', 'Shikaripura', 'Soraba'],
    'Belagavi': ['Belagavi', 'Athani', 'Chikkodi', 'Gokak', 'Hukkeri', 'Khanapur'],
    'Chennai': ['Chennai North', 'Chennai South', 'Chennai Central'],
    'Coimbatore': ['Coimbatore North', 'Coimbatore South', 'Pollachi', 'Mettupalayam'],
    'Madurai': ['Madurai North', 'Madurai South', 'Melur', 'Thirumangalam'],
    'Tiruchirappalli': ['Trichy East', 'Trichy West', 'Lalgudi', 'Manapparai'],
    'Salem': ['Salem', 'Attur', 'Mettur', 'Omalur', 'Yercaud'],
    'Krishna': ['Vijayawada', 'Machilipatnam', 'Gudivada', 'Nuzvid'],
    'Guntur': ['Guntur', 'Tenali', 'Narasaraopet', 'Bapatla'],
    'Kurnool': ['Kurnool', 'Adoni', 'Nandyal', 'Yemmiganur'],
    'Pune': ['Pune City', 'Haveli', 'Baramati', 'Maval', 'Shirur'],
    'Mumbai': ['Mumbai City', 'Mumbai Suburban'],
    'Nagpur': ['Nagpur Urban', 'Nagpur Rural', 'Kamptee', 'Ramtek', 'Saoner']
  },
  
  hoblis: {
    'Mandya': ['Mandya Kasaba', 'Dudda', 'Basaralu', 'Keragodu'],
    'Maddur': ['Maddur Kasaba', 'Koppa', 'C.A. Kere', 'Athagur'],
    'Malavalli': ['Malavalli Kasaba', 'Kirugavalu', 'Halagur', 'Boppegowdanapura'],
    'Pandavapura': ['Pandavapura Kasaba', 'Melukote', 'Chinkurli'],
    'Srirangapatna': ['Srirangapatna Kasaba', 'Arakere', 'K. Shettihalli']
  },
  
  villages: {
    'Mandya Kasaba': [
      { name: 'Mandya Village', pincode: '571401' },
      { name: 'Gopalapura', pincode: '571401' },
      { name: 'Guthalu', pincode: '571403' },
      { name: 'Boodanur', pincode: '571402' }
    ],
    'Dudda': [
      { name: 'Dudda Village', pincode: '571405' },
      { name: 'Shivalli', pincode: '571405' },
      { name: 'Keelara', pincode: '571402' }
    ],
    'Malavalli Kasaba': [
      { name: 'Malavalli Village', pincode: '571430' },
      { name: 'Marehalli', pincode: '571430' },
      { name: 'Kandegala', pincode: '571430' },
      { name: 'Netkal', pincode: '571417' }
    ],
    'Kirugavalu': [
      { name: 'Kirugavalu Village', pincode: '571424' },
      { name: 'Banaasandra', pincode: '571424' },
      { name: 'Hullahalli', pincode: '571463' }
    ],
    'Maddur Kasaba': [
      { name: 'Maddur Village', pincode: '571428' },
      { name: 'Somanahalli', pincode: '571428' },
      { name: 'Kestur', pincode: '571429' }
    ]
  }
};

// Flattened fallback lists for non-hobli taluks to return simple villages
export const FALLBACK_VILLAGES = {
  'Bangalore North': [
    { name: 'Yeshwanthpur Village', pincode: '560022' },
    { name: 'Peenya Village', pincode: '560058' },
    { name: 'Jalahalli Village', pincode: '560013' }
  ],
  'Mysore': [
    { name: 'Chamundi Hill Village', pincode: '570010' },
    { name: 'Naganahalli', pincode: '570003' },
    { name: 'Yelwala', pincode: '571130' }
  ],
  'Kolar': [
    { name: 'Kolar Village', pincode: '563101' },
    { name: 'Huttur', pincode: '563102' },
    { name: 'Vokkaleri', pincode: '563130' }
  ],
  'Tumkur': [
    { name: 'Tumkur Town', pincode: '572101' },
    { name: 'Kyathsandra', pincode: '572104' },
    { name: 'Mallasandra', pincode: '572107' }
  ],
  'Hassan': [
    { name: 'Hassan Village', pincode: '573201' },
    { name: 'Kandali', pincode: '573217' },
    { name: 'Gorur', pincode: '573120' }
  ]
};

// PIN Code reverse mapping helper
export function resolvePincode(pincode) {
  const cleanPin = String(pincode).trim();
  
  // Search in structured villages
  for (const hobli in LOCATIONS.villages) {
    const found = LOCATIONS.villages[hobli].find(v => v.pincode === cleanPin);
    if (found) {
      // Find taluk
      let parentTaluk = '';
      for (const taluk in LOCATIONS.hoblis) {
        if (LOCATIONS.hoblis[taluk].includes(hobli)) {
          parentTaluk = taluk;
          break;
        }
      }
      
      // Find district
      let parentDistrict = '';
      for (const district in LOCATIONS.taluks) {
        if (LOCATIONS.taluks[district].includes(parentTaluk)) {
          parentDistrict = district;
          break;
        }
      }

      // Find state
      let parentState = '';
      for (const state in LOCATIONS.districts) {
        if (LOCATIONS.districts[state].includes(parentDistrict)) {
          parentState = state;
          break;
        }
      }

      return {
        country: 'India',
        state: parentState,
        district: parentDistrict,
        taluk: parentTaluk,
        hobli: hobli,
        village: found.name,
        pincode: cleanPin
      };
    }
  }

  // Search in fallback lists
  for (const taluk in FALLBACK_VILLAGES) {
    const found = FALLBACK_VILLAGES[taluk].find(v => v.pincode === cleanPin);
    if (found) {
      // Find district
      let parentDistrict = '';
      for (const district in LOCATIONS.taluks) {
        if (LOCATIONS.taluks[district].includes(taluk)) {
          parentDistrict = district;
          break;
        }
      }

      // Find state
      let parentState = '';
      for (const state in LOCATIONS.districts) {
        if (LOCATIONS.districts[state].includes(parentDistrict)) {
          parentState = state;
          break;
        }
      }

      return {
        country: 'India',
        state: parentState,
        district: parentDistrict,
        taluk: taluk,
        hobli: '',
        village: found.name,
        pincode: cleanPin
      };
    }
  }

  return null;
}
