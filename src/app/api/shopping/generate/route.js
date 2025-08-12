// file: /src/app/api/shopping/generate/route.js v42 - FIXED MongoDB connection issue

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { Recipe, UserInventory, MealPlan } from '@/lib/models';
import { CategoryUtils, findBestCategoryMatch, getAllCategoryNames, normalizeIngredientForCategorization } from '@/lib/groceryCategories';

// UNIFIED: Use comprehensive ingredients matching from groceryCategories + enhanced variations
const NEVER_MATCH_INGREDIENTS = [
    // Only the most critical specialty items that should NEVER cross-match
    'tomato paste', 'tomato sauce', 'crushed tomatoes', 'diced tomatoes', 'tomato puree',
    'sun dried tomatoes', 'fire roasted tomatoes', 'whole tomatoes', 'stewed tomatoes',

    // Specialty flours (but allow basic flour matching)
    'almond flour', 'coconut flour', 'cake flour', 'bread flour', 'self rising flour',
    'whole wheat flour', 'gluten free flour', 'gluten-free flour', 'oat flour', 'rice flour',

    // Specialty sugars (but allow basic sugar matching)
    'powdered sugar', 'confectioners sugar', 'coconut sugar', 'maple sugar',
    'swerve', 'stevia', 'erythritol', 'monk fruit', 'xylitol', 'sugar substitute',

    // Alternative milks (but allow regular milk matching)
    'almond milk', 'oat milk', 'soy milk', 'coconut milk', 'rice milk', 'cashew milk',

    // Specialty dairy (but allow basic dairy matching)
    'buttermilk', 'heavy cream', 'half and half', 'cream cheese',

    // Vegan alternatives
    'vegan butter', 'vegan cheese', 'vegan milk', 'vegan bacon', 'vegan sausage',
    'vegan beef', 'vegan chicken', 'plant butter', 'plant milk', 'plant beef',

    // Specialty extracts and very specific seasonings
    'vanilla extract', 'almond extract'
];

const NEVER_CROSS_MATCH = {
    'peanut butter': ['butter'],
    'almond butter': ['butter'],
    'green onions': ['onion', 'onions'],
    'scallions': ['onion', 'onions'],
    'red bell pepper': ['pepper'],
    'green bell pepper': ['pepper'],
    'red pepper diced': ['pepper'],
    'buttermilk': ['milk', 'butter'],
    'heavy cream': ['milk'],
    'sour cream': ['cream', 'milk'],
    'cream cheese': ['cheese', 'cream'],
    'vegan bacon': ['bacon'],
    'sugar substitute': ['sugar'],
    'brown sugar': ['sugar'],
    'packed brown sugar': ['sugar'],

    // Prevent inappropriate beef cut cross-matching
    'cube steaks': ['ground beef', 'steak', 'roast'],
    'cubed steaks': ['ground beef', 'steak', 'roast'],
    'ground beef': ['cube steaks', 'cubed steaks', 'steak', 'roast'],
    'ribeye steak': ['ground beef', 'chuck roast', 'round steak'],
    'strip steak': ['ground beef', 'chuck roast', 'round steak'],
    'sirloin steak': ['ground beef', 'chuck roast'],
    'chuck roast': ['steak', 'ground beef'],
    'brisket': ['steak', 'ground beef', 'roast'],
    'short ribs': ['steak', 'ground beef'],
    'stew meat': ['steak', 'roast'],

    // Prevent inappropriate pork cut cross-matching
    'pork shoulder': ['pork chops', 'pork tenderloin', 'ground pork', 'bacon'],
    'boston butt': ['pork chops', 'pork tenderloin', 'ground pork', 'bacon'],
    'pork chops': ['ground pork', 'pork shoulder', 'pork belly', 'bacon'],
    'pork tenderloin': ['ground pork', 'pork shoulder', 'pork chops', 'bacon'],
    'ground pork': ['pork chops', 'pork tenderloin', 'pork shoulder', 'bacon'],
    'pork belly': ['pork chops', 'pork tenderloin', 'ground pork'],
    'bacon': ['pork chops', 'pork tenderloin', 'ground pork', 'pork shoulder'],
    'italian sausage': ['ground pork', 'pork chops', 'pork tenderloin'],
    'baby back ribs': ['spare ribs', 'pork chops', 'ground pork'],
    'spare ribs': ['baby back ribs', 'pork chops', 'ground pork'],

// Prevent inappropriate poultry cut cross-matching
    'chicken breast': ['ground chicken', 'chicken thighs', 'chicken wings', 'chicken legs'],
    'chicken thighs': ['chicken breast', 'ground chicken', 'chicken wings'],
    'chicken legs': ['chicken breast', 'chicken thighs', 'ground chicken', 'chicken wings'],
    'chicken wings': ['chicken breast', 'chicken thighs', 'chicken legs', 'ground chicken'],
    'ground chicken': ['chicken breast', 'chicken thighs', 'chicken legs', 'chicken wings'],
    'whole chicken': ['chicken breast', 'chicken thighs', 'ground chicken'],
    'turkey breast': ['ground turkey', 'turkey thighs', 'turkey legs'],
    'ground turkey': ['turkey breast', 'turkey thighs', 'turkey legs', 'whole turkey'],
    'whole turkey': ['turkey breast', 'ground turkey'],

// Prevent cross-species matching
    'pork': ['chicken', 'turkey', 'beef', 'duck'],
    'chicken': ['pork', 'beef', 'turkey', 'duck'],
    'turkey': ['chicken', 'pork', 'beef', 'duck'],
    'beef': ['pork', 'chicken', 'turkey', 'duck'],
    'duck': ['chicken', 'turkey', 'pork', 'beef'],

    // CRITICAL: Tomato product cross-matching prevention
    'tomato paste': ['tomato', 'tomatoes', 'whole tomatoes', 'fresh tomatoes'],
    'tomato sauce': ['tomato', 'tomatoes', 'whole tomatoes', 'fresh tomatoes'],
    'crushed tomatoes': ['tomato', 'tomatoes', 'whole tomatoes', 'fresh tomatoes'],
    'diced tomatoes': ['tomato', 'tomatoes', 'whole tomatoes', 'fresh tomatoes'],
    'tomato puree': ['tomato', 'tomatoes', 'whole tomatoes', 'fresh tomatoes'],
    'sun dried tomatoes': ['tomato', 'tomatoes', 'whole tomatoes', 'fresh tomatoes'],
    'cherry tomatoes': ['tomato', 'tomatoes', 'whole tomatoes'],
    'roma tomatoes': ['tomato', 'tomatoes', 'whole tomatoes'],
    'whole tomatoes': ['tomato paste', 'tomato sauce', 'crushed tomatoes', 'diced tomatoes'],
    'fresh tomatoes': ['tomato paste', 'tomato sauce', 'crushed tomatoes', 'diced tomatoes']
};

// ENHANCED: Comprehensive ingredient variations incorporating groceryCategories knowledge
const INGREDIENT_VARIATIONS = {
    // Garlic variations
    'garlic': ['garlic cloves', 'garlic bulb', 'minced garlic', 'fresh garlic', 'chopped garlic', 'garlic minced'],
    'garlic cloves': ['garlic', 'fresh garlic', 'minced garlic', 'cloves garlic'],
    'minced garlic': ['garlic', 'garlic cloves', 'garlic minced'],

    // Onion variations
    'onion': ['onions', 'yellow onion', 'white onion', 'red onion', 'sweet onion', 'vidalia onion', 'onion chopped'],
    'onions': ['onion', 'yellow onion', 'white onion', 'sweet onion', 'onion chopped'],
    'yellow onion': ['onion', 'onions', 'white onion', 'sweet onion'],
    'red onion': ['onion', 'onions'],
    'sweet onion': ['onion', 'onions', 'yellow onion', 'vidalia onion'],

    // Green onions (separate from regular onions)
    'green onion': ['green onions', 'scallions', 'scallion', 'spring onions'],
    'green onions': ['green onion', 'scallions', 'scallion', 'spring onions'],
    'scallions': ['green onions', 'green onion', 'scallion', 'spring onions'],

    // Bell peppers
    'bell pepper': ['bell peppers', 'red bell pepper', 'green bell pepper', 'yellow bell pepper'],
    'red bell pepper': ['red bell peppers', 'red pepper'],
    'green bell pepper': ['green bell peppers', 'green pepper'],
    'yellow bell pepper': ['yellow bell peppers', 'yellow pepper'],

    // Hot peppers
    'jalapeno': ['jalapeños', 'jalapenos', 'jalapeño'],
    'serrano': ['serranos', 'serrano pepper', 'serrano peppers'],
    'poblano': ['poblanos', 'poblano pepper', 'poblano peppers'],

    // Tomatoes - KEEP SEPARATE TYPES
    'tomatoes': ['fresh tomatoes', 'whole tomatoes', 'ripe tomatoes'],
    'fresh tomatoes': ['tomatoes', 'whole tomatoes', 'ripe tomatoes'],
    'whole tomatoes': ['fresh tomatoes', 'tomatoes', 'ripe tomatoes'],
    'cherry tomatoes': ['grape tomatoes', 'small tomatoes'],
    'roma tomatoes': ['plum tomatoes', 'paste tomatoes'],

    // Processed tomato products (separate from fresh)
    'tomato paste': ['concentrated tomato paste', 'double concentrated tomato paste'],
    'tomato sauce': ['marinara sauce', 'basic tomato sauce'],
    'crushed tomatoes': ['crushed canned tomatoes'],
    'diced tomatoes': ['diced canned tomatoes', 'chopped tomatoes'],

    // Mushrooms
    'mushroom': ['mushrooms', 'button mushrooms', 'cremini mushrooms'],
    'mushrooms': ['mushroom', 'button mushrooms', 'cremini mushrooms'],
    'shiitake': ['shiitake mushrooms'],
    'portobello': ['portobello mushrooms'],


    // ========================================
    // COMPREHENSIVE BEEF CUTS (American/Canadian)
    // ========================================

    // FOREQUARTER - Chuck
    'chuck roast': ['chuck pot roast', 'chuck arm roast', 'chuck blade roast', 'shoulder roast', 'chuck shoulder roast', 'pot roast'],
    'chuck steak': ['chuck blade steak', 'chuck arm steak', 'shoulder steak', 'chuck eye steak', 'chuck steaks'],
    'chuck eye steak': ['chuck steak', 'chuck eye', 'mock tender steak'],
    'ground chuck': ['ground beef chuck', 'chuck ground beef', '80/20 ground beef'],

    // FOREQUARTER - Rib
    'prime rib': ['standing rib roast', 'prime rib roast', 'rib roast'],
    'rib eye steak': ['ribeye steak', 'ribeye', 'rib eye', 'delmonico steak', 'spencer steak'],
    'ribeye steak': ['rib eye steak', 'ribeye', 'rib eye', 'delmonico steak'],
    'ribeye': ['rib eye steak', 'ribeye steak', 'rib eye'],
    'short ribs': ['beef short ribs', 'braising ribs', 'chuck short ribs', 'plate ribs'],

    // FOREQUARTER - Brisket
    'brisket': ['beef brisket', 'whole brisket', 'packer brisket', 'bbq brisket', 'smoking brisket'],
    'brisket flat': ['brisket flat cut', 'first cut brisket'],
    'brisket point': ['brisket point cut', 'second cut brisket', 'deckle'],

    // FOREQUARTER - Shank & Plate
    'beef shank': ['shank', 'fore shank', 'front shank', 'soup bones'],
    'skirt steak': ['outside skirt steak', 'fajita meat', 'skirt', 'fajita steak'],
    'inside skirt steak': ['inside skirt', 'fajita steak'],
    'hanger steak': ['hanging tender', 'butchers steak', 'onglet'],

    // HINDQUARTER - Short Loin
    't-bone steak': ['t bone steak', 'tbone steak', 't-bone', 't bone'],
    'porterhouse steak': ['porterhouse', 'king steak'],
    'strip steak': ['new york strip', 'ny strip', 'strip loin', 'kansas city strip', 'top loin steak'],
    'new york strip': ['ny strip', 'strip steak', 'strip loin', 'new york strip steak'],

    // HINDQUARTER - Sirloin
    'sirloin steak': ['top sirloin steak', 'sirloin', 'top sirloin'],
    'top sirloin': ['top sirloin steak', 'sirloin steak', 'sirloin'],
    'bottom sirloin': ['sirloin tip', 'sirloin tip steak', 'tri tip'],
    'tri tip': ['tri-tip', 'triangle tip', 'bottom sirloin tip', 'tri tip roast'],
    'sirloin tip': ['sirloin tip steak', 'sirloin tip roast', 'ball tip'],

    // HINDQUARTER - Tenderloin
    'tenderloin': ['beef tenderloin', 'whole tenderloin', 'psmo', 'tenderloin roast'],
    'filet mignon': ['tenderloin steak', 'filet', 'beef filet', 'tournedos'],
    'beef tenderloin': ['tenderloin', 'whole tenderloin', 'tenderloin roast'],

    // HINDQUARTER - Round (Hip in Canada)
    'round steak': ['top round steak', 'bottom round steak', 'eye round steak'],
    'top round': ['top round steak', 'top round roast', 'london broil'],
    'bottom round': ['bottom round steak', 'bottom round roast', 'rump roast'],
    'eye of round': ['eye round', 'eye of round steak', 'eye of round roast'],
    'rump roast': ['bottom round roast', 'rump', 'round tip roast'],
    'london broil': ['top round steak', 'shoulder london broil', 'flank steak'],

    // HINDQUARTER - Flank
    'flank steak': ['flank', 'london broil flank', 'jiffy steak'],

    // SPECIALTY CUTS - Cube/Mechanically Tenderized
    'cube steaks': ['cubed steaks', 'cube steak', 'cubed steak', 'minute steaks', 'swiss steaks', 'minute steak'],
    'cubed steaks': ['cube steaks', 'cube steak', 'cubed steak', 'minute steaks', 'swiss steaks'],
    'cube steak': ['cubed steak', 'cube steaks', 'cubed steaks', 'minute steak', 'swiss steak'],
    'cubed steak': ['cube steak', 'cube steaks', 'cubed steaks', 'minute steak'],
    'minute steaks': ['cube steaks', 'cubed steaks', 'minute steak', 'swiss steaks'],
    'minute steak': ['minute steaks', 'cube steak', 'cubed steak'],
    'swiss steaks': ['cube steaks', 'cubed steaks', 'swiss steak'],
    'swiss steak': ['swiss steaks', 'cube steaks'],

    // GROUND BEEF VARIATIONS
    'ground beef': ['ground chuck', 'ground round', 'ground sirloin', 'hamburger', 'lean ground beef', 'extra lean ground beef'],
    'ground round': ['ground beef', 'lean ground beef', '85/15 ground beef'],
    'ground sirloin': ['ground beef', 'extra lean ground beef', '90/10 ground beef'],
    'lean ground beef': ['ground beef', 'ground round', '85/15 ground beef'],
    'extra lean ground beef': ['ground beef', 'ground sirloin', '90/10 ground beef'],

    // STEW AND SOUP CUTS
    'stew meat': ['beef stew meat', 'stewing beef', 'stew beef', 'beef for stew'],
    'beef stew meat': ['stew meat', 'stewing beef', 'chuck stew meat'],
    'stewing beef': ['stew meat', 'beef stew meat', 'stew beef'],
    'soup bones': ['beef soup bones', 'marrow bones', 'beef bones'],

    // CANADIAN SPECIFIC (Round = Hip)
    'hip': ['round', 'hip roast', 'round roast'],
    'hip steak': ['round steak', 'hip round steak'],

    // PORK SHOULDER/BOSTON BUTT
    'pork shoulder': ['boston butt', 'pork butt', 'shoulder roast', 'boston shoulder', 'pork shoulder roast', 'pulled pork'],
    'boston butt': ['pork shoulder', 'pork butt', 'shoulder roast', 'boston shoulder', 'pulled pork'],
    'pork butt': ['boston butt', 'pork shoulder', 'shoulder roast', 'pulled pork'],
    'shoulder roast': ['pork shoulder', 'boston butt', 'pork shoulder roast'],
    'pulled pork': ['pork shoulder', 'boston butt', 'barbecue pork', 'bbq pork'],

// PORK PICNIC SHOULDER
    'picnic shoulder': ['picnic roast', 'arm roast', 'picnic ham', 'fresh picnic'],
    'picnic roast': ['picnic shoulder', 'arm roast', 'picnic ham'],
    'arm roast': ['picnic roast', 'picnic shoulder'],

// PORK LOIN
    'pork loin': ['center cut loin', 'loin roast', 'pork loin roast', 'whole pork loin'],
    'pork loin roast': ['pork loin', 'loin roast', 'center cut loin roast'],
    'loin roast': ['pork loin', 'pork loin roast'],

// PORK TENDERLOIN
    'pork tenderloin': ['tenderloin', 'pork filet', 'pork tender', 'whole tenderloin'],
    'pork filet': ['pork tenderloin', 'tenderloin', 'pork tender'],

// PORK CHOPS
    'pork chops': ['center cut pork chops', 'loin chops', 'center cut chops', 'pork loin chops'],
    'center cut pork chops': ['pork chops', 'center cut chops', 'loin chops'],
    'loin chops': ['pork chops', 'center cut chops', 'pork loin chops'],
    'rib chops': ['rib cut chops', 'rib pork chops', 'ribeye chops'],
    'sirloin chops': ['sirloin pork chops', 'sirloin cut chops'],
    'blade chops': ['shoulder chops', 'shoulder end chops'],
    'boneless pork chops': ['boneless chops', 'pork chops boneless'],

// PORK RIBS
    'baby back ribs': ['baby ribs', 'back ribs', 'loin ribs', 'top loin ribs'],
    'spare ribs': ['spareribs', 'side ribs', 'pork spare ribs'],
    'st louis ribs': ['st. louis ribs', 'saint louis ribs', 'st louis style ribs'],
    'country style ribs': ['country-style ribs', 'country ribs', 'blade end ribs'],
    'rib tips': ['pork rib tips', 'spare rib tips'],

// PORK HAM/LEG
    'fresh ham': ['leg of pork', 'pork leg', 'whole ham', 'uncured ham'],
    'leg of pork': ['fresh ham', 'pork leg', 'whole ham'],
    'ham steak': ['fresh ham steak', 'center cut ham', 'ham slice'],
    'cured ham': ['smoked ham', 'spiral ham', 'honey ham', 'glazed ham'],
    'spiral ham': ['spiral cut ham', 'cured ham', 'smoked ham'],

// PORK BELLY & BACON
    'pork belly': ['fresh pork belly', 'uncured pork belly', 'skin-on pork belly'],
    'bacon': ['pork bacon', 'sliced bacon', 'thick cut bacon', 'regular bacon'],
    'thick cut bacon': ['thick bacon', 'bacon', 'thick slice bacon'],
    'salt pork': ['salted pork', 'cured pork belly'],

    // PORK GROUND & SAUSAGES
    'ground pork': ['pork mince', 'minced pork', 'ground pork meat'],
    'pork sausage': ['fresh pork sausage', 'breakfast sausage', 'bulk sausage'],
    'italian sausage': ['italian pork sausage', 'sweet italian sausage', 'hot italian sausage',
    'italian turkey sausage', 'spicy italian sausage'],

    'sweet italian sausage': ['italian sausage', 'mild italian sausage'],
    'hot italian sausage': ['spicy italian sausage', 'italian sausage'],
    'bratwurst': ['brats', 'bratwurst sausage', 'fresh bratwurst'],
    'chorizo': ['fresh chorizo', 'mexican chorizo', 'pork chorizo'],
    'kielbasa': ['polish sausage', 'kielbasa sausage', 'polish kielbasa'],

// PORK SPECIALTY
    'pork hock': ['ham hock', 'hock', 'smoked hock', 'fresh hock'],
    'pork feet': ['pig feet', 'trotters', 'pigs feet'],

// Chicken variations
    'chicken': ['chicken breast', 'chicken thighs', 'chicken legs', 'chicken wings', 'whole chicken'],


// WHOLE CHICKEN
    'whole chicken': ['whole fryer', 'whole roaster', 'whole broiler', 'fryer chicken', 'roaster chicken'],
    'fryer chicken': ['whole fryer', 'young chicken', 'broiler chicken'],
    'roaster chicken': ['whole roaster', 'roasting chicken'],

// CHICKEN BREASTS
    'chicken breast': ['chicken breasts', 'bone-in chicken breast', 'skin-on chicken breast'],
    'boneless chicken breast': ['boneless chicken breasts', 'boneless skinless chicken breast', 'chicken breast boneless'],
    'boneless skinless chicken breast': ['boneless skinless chicken breasts', 'boneless chicken breast', 'skinless chicken breast'],
    'chicken tenderloins': ['chicken tenderloin', 'chicken tenders', 'chicken strips'],
    'chicken tenders': ['chicken tenderloins', 'chicken tenderloin', 'chicken strips'],
    'chicken cutlets': ['chicken breast cutlets', 'pounded chicken breast', 'chicken scallopini'],

// CHICKEN THIGHS
    'chicken thighs': ['chicken thigh', 'bone-in chicken thighs', 'skin-on chicken thighs'],
    'boneless chicken thighs': ['boneless chicken thigh', 'boneless skinless chicken thighs', 'chicken thighs boneless'],
    'boneless skinless chicken thighs': ['boneless skinless chicken thigh', 'boneless chicken thighs'],

// CHICKEN LEGS & DRUMSTICKS
    'chicken leg quarters': ['leg quarters', 'chicken leg quarter', 'leg and thigh'],
    'chicken drumsticks': ['chicken drumstick', 'drumsticks', 'chicken legs'],
    'chicken legs': ['chicken leg', 'whole chicken legs', 'chicken drumsticks'],

// CHICKEN WINGS
    'chicken wings': ['chicken wing', 'whole chicken wings', 'party wings'],
    'chicken wing flats': ['wing flats', 'chicken flats', 'wing middles'],
    'chicken drumettes': ['drumettes', 'wing drumettes', 'chicken wing drumettes'],
    'wing tips': ['chicken wing tips', 'wing tip'],

// CHICKEN GROUND & SPECIALTY
    'ground chicken': ['chicken mince', 'minced chicken', 'ground chicken meat'],
    'chicken liver': ['chicken livers', 'poultry liver'],
    'chicken gizzards': ['chicken gizzard', 'gizzards'],

// TURKEY
    'whole turkey': ['whole tom turkey', 'whole hen turkey', 'fresh turkey', 'frozen turkey'],
    'turkey breast': ['turkey breasts', 'bone-in turkey breast', 'whole turkey breast'],
    'boneless turkey breast': ['boneless turkey breasts', 'turkey breast boneless', 'boneless skinless turkey breast'],
    'turkey thighs': ['turkey thigh', 'bone-in turkey thighs'],
    'boneless turkey thighs': ['boneless turkey thigh', 'turkey thighs boneless'],
    'turkey legs': ['turkey leg', 'whole turkey legs'],
    'turkey drumsticks': ['turkey drumstick', 'turkey drums'],
    'turkey wings': ['turkey wing', 'whole turkey wings'],
    'ground turkey': ['turkey mince', 'minced turkey', 'ground turkey meat'],
    'lean ground turkey': ['ground turkey', 'extra lean ground turkey'],
    'ground turkey breast': ['ground turkey', 'lean ground turkey'],

// DUCK & GOOSE
    'whole duck': ['whole duckling', 'fresh duck', 'roasting duck'],
    'duck breast': ['duck breasts', 'boneless duck breast', 'duck breast fillet'],
    'duck legs': ['duck leg', 'duck leg quarters'],
    'whole goose': ['fresh goose', 'roasting goose'],

// CORNISH HEN & GAME BIRDS
    'cornish hen': ['cornish game hen', 'rock cornish hen', 'cornish hens'],
    'cornish game hen': ['cornish hen', 'rock cornish hen', 'game hen'],



    // Cheese variations
    'mozzarella': ['mozzarella cheese', 'fresh mozzarella', 'part skim mozzarella'],
    'shredded mozzarella': ['shredded mozzarella cheese', 'grated mozzarella'],
    'cheddar': ['cheddar cheese', 'sharp cheddar', 'mild cheddar', 'aged cheddar'],
    'shredded cheddar': ['shredded cheddar cheese', 'grated cheddar'],
    'parmesan': ['parmigiano-reggiano', 'parmesan cheese', 'grated parmesan'],

    // Egg variations
    'eggs': ['large eggs', 'extra large eggs', 'jumbo eggs', 'medium eggs', 'small eggs'],
    'egg': ['eggs', 'large egg', 'extra large egg', 'jumbo egg', 'medium egg', 'small egg'],

    // COMPREHENSIVE pasta variations (unified from groceryCategories)
    'pasta': [
        'spaghetti', 'penne', 'fusilli', 'rigatoni', 'linguine', 'fettuccine', 'angel hair',
        'penne pasta', 'spaghetti pasta', 'fusilli pasta', 'rigatoni pasta', 'linguine pasta',
        'fettuccine pasta', 'angel hair pasta', 'bow tie pasta', 'rotini pasta', 'macaroni',
        'macaroni pasta', 'shells', 'shell pasta', 'farfalle', 'gemelli', 'orzo',
        'pappardelle', 'tagliatelle', 'bucatini', 'cavatappi', 'ziti'
    ],
    'spaghetti': ['spaghetti pasta', 'thin spaghetti', 'whole wheat spaghetti'],
    'penne': ['penne pasta', 'penne rigate', 'whole wheat penne'],
    'fettuccine': ['fettuccine pasta', 'fresh fettuccine', 'whole wheat fettuccine'],
    'fusilli': ['fusilli pasta', 'rotini', 'spiral pasta'],
    'rigatoni': ['rigatoni pasta', 'large rigatoni'],
    'linguine': ['linguine pasta', 'thin linguine'],
    'angel hair': ['angel hair pasta', 'capellini', 'thin pasta'],
    'bow tie': ['bow tie pasta', 'farfalle', 'farfalle pasta'],
    'macaroni': ['macaroni pasta', 'elbow macaroni', 'elbow pasta'],
    'shells': ['shell pasta', 'conchiglie', 'pasta shells'],

    // Rice variations
    'rice': ['white rice', 'brown rice', 'jasmine rice', 'basmati rice', 'wild rice'],
    'white rice': ['rice', 'long grain rice'],
    'brown rice': ['rice', 'whole grain rice'],
    'jasmine rice': ['rice', 'fragrant rice'],
    'basmati rice': ['rice', 'long grain rice'],

    // Oil variations
    'olive oil': ['extra virgin olive oil', 'virgin olive oil', 'light olive oil'],
    'vegetable oil': ['canola oil', 'sunflower oil', 'corn oil'],

    // Flour variations
    'flour': ['all purpose flour', 'all-purpose flour', 'plain flour', 'white flour'],
    'all purpose flour': ['flour', 'all-purpose flour', 'plain flour'],

    // Sugar variations
    'sugar': ['white sugar', 'granulated sugar', 'cane sugar', 'pure cane sugar'],
    'brown sugar': ['light brown sugar', 'dark brown sugar', 'packed brown sugar'],

    // Butter and dairy
    'butter': ['unsalted butter', 'salted butter', 'sweet cream butter'],
    'milk': ['whole milk', '2% milk', '1% milk', 'skim milk', 'vitamin d milk'],

    // Salt and pepper
    'salt': ['table salt', 'sea salt', 'kosher salt', 'fine salt'],
    'pepper': ['black pepper', 'ground pepper', 'cracked pepper'],
    'black pepper': ['pepper', 'ground black pepper'],

    // International ingredients
    'soy sauce': ['light soy sauce', 'dark soy sauce', 'tamari'],
    'sesame oil': ['toasted sesame oil', 'pure sesame oil'],
    'rice vinegar': ['rice wine vinegar', 'seasoned rice vinegar'],

    // Mexican ingredients
    'tortillas': ['flour tortillas', 'corn tortillas'],
    'salsa': ['chunky salsa', 'smooth salsa', 'mild salsa', 'hot salsa'],
    'cilantro': ['fresh cilantro', 'cilantro leaves'],

    // Herbs and spices
    'oregano': ['fresh oregano', 'dried oregano'],
    'basil': ['fresh basil', 'dried basil'],
    'thyme': ['fresh thyme', 'dried thyme'],
    'rosemary': ['fresh rosemary', 'dried rosemary'],
    'parsley': ['fresh parsley', 'dried parsley', 'flat leaf parsley', 'curly parsley'],

    // Other common ingredients
    'sesame seeds': ['toasted sesame seeds', 'white sesame seeds'],
    'white wine': ['dry white wine', 'cooking wine', 'white cooking wine'],
    'red pepper flakes': ['crushed red pepper', 'red chili flakes'],
    'chives': ['fresh chives', 'chopped chives'],
    'bread crumbs': ['fresh bread crumbs', 'italian bread crumbs', 'panko bread crumbs', 'panko']
};

// UPDATED: Better ingredient normalization
function normalizeIngredient(ingredient) {
    if (!ingredient || typeof ingredient !== 'string') {
        return '';
    }

    return ingredient
        .toLowerCase()
        .trim()
        .replace(/\([^)]*\)/g, '')
        .replace(/\b(organic|natural|pure|fresh|raw|whole|fine|coarse|ground)\b/g, '')
        .replace(/\b(small|medium|large|extra large|jumbo|mini)\b/g, '')
        .replace(/\b(can|jar|bottle|bag|box|package|container)\b/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// UPDATED: Check if ingredient is specialty and shouldn't cross-match
function isSpecialtyIngredient(ingredient) {
    const normalized = normalizeIngredient(ingredient);
    return NEVER_MATCH_INGREDIENTS.some(specialty => {
        const specialtyNorm = normalizeIngredient(specialty);
        return normalized === specialtyNorm || normalized.includes(specialtyNorm);
    });
}

// UPDATED: Check if two ingredients can match
function canIngredientsMatch(recipeIngredient, inventoryIngredient) {
    const recipeNorm = normalizeIngredient(recipeIngredient);
    const inventoryNorm = normalizeIngredient(inventoryIngredient);

    console.log(`[SHOPPING API] Checking match: "${recipeIngredient}" (${recipeNorm}) vs "${inventoryIngredient}" (${inventoryNorm})`);

    // Exact match
    if (recipeNorm === inventoryNorm) {
        console.log(`[SHOPPING API] ✅ EXACT MATCH`);
        return true;
    }

    // Check NEVER_CROSS_MATCH rules FIRST
    for (const [ingredient, blockedMatches] of Object.entries(NEVER_CROSS_MATCH)) {
        const ingredientNorm = normalizeIngredient(ingredient);

        if (recipeNorm === ingredientNorm || recipeNorm.includes(ingredientNorm)) {
            if (blockedMatches.some(blocked => {
                const blockedNorm = normalizeIngredient(blocked);
                return inventoryNorm === blockedNorm || inventoryNorm.includes(blockedNorm);
            })) {
                console.log(`[SHOPPING API] ❌ BLOCKED MATCH: "${recipeIngredient}" cannot match "${inventoryIngredient}"`);
                return false;
            }
        }

        if (inventoryNorm === ingredientNorm || inventoryNorm.includes(ingredientNorm)) {
            if (blockedMatches.some(blocked => {
                const blockedNorm = normalizeIngredient(blocked);
                return recipeNorm === blockedNorm || recipeNorm.includes(blockedNorm);
            })) {
                console.log(`[SHOPPING API] ❌ BLOCKED MATCH: "${recipeIngredient}" cannot match "${inventoryIngredient}"`);
                return false;
            }
        }
    }

    // Check if either is a specialty ingredient
    if (isSpecialtyIngredient(recipeIngredient) || isSpecialtyIngredient(inventoryIngredient)) {
        const recipeVariations = getIngredientVariations(recipeIngredient);
        const inventoryVariations = getIngredientVariations(inventoryIngredient);

        for (const recipeVar of recipeVariations) {
            for (const invVar of inventoryVariations) {
                if (recipeVar === invVar) {
                    console.log(`[SHOPPING API] ✅ SPECIALTY VARIATION MATCH: ${recipeVar}`);
                    return true;
                }
            }
        }
        console.log(`[SHOPPING API] ❌ SPECIALTY INGREDIENT - no variation match`);
        return false;
    }

    // Check ingredient variations
    const recipeVariations = getIngredientVariations(recipeIngredient);
    const inventoryVariations = getIngredientVariations(inventoryIngredient);

    for (const recipeVar of recipeVariations) {
        for (const invVar of inventoryVariations) {
            if (recipeVar === invVar) {
                console.log(`[SHOPPING API] ✅ VARIATION MATCH: ${recipeVar}`);
                return true;
            }
        }
    }

    // Relaxed partial matching for common ingredients
    if (recipeNorm.length >= 4 && inventoryNorm.length >= 4) {
        if (recipeNorm.includes(inventoryNorm) || inventoryNorm.includes(recipeNorm)) {
            const shorterLength = Math.min(recipeNorm.length, inventoryNorm.length);
            const longerLength = Math.max(recipeNorm.length, inventoryNorm.length);
            const similarity = shorterLength / longerLength;

            if (similarity >= 0.7) {
                console.log(`[SHOPPING API] ✅ PARTIAL MATCH: similarity ${similarity.toFixed(2)}`);
                return true;
            }
        }
    }

    console.log(`[SHOPPING API] ❌ NO MATCH`);
    return false;
}

// Get all variations of an ingredient
function getIngredientVariations(ingredient) {
    const normalized = normalizeIngredient(ingredient);

    if (isSpecialtyIngredient(ingredient)) {
        return [normalized, ingredient.toLowerCase().trim()];
    }

    const variations = new Set([normalized]);
    variations.add(ingredient.toLowerCase().trim());

    if (INGREDIENT_VARIATIONS[normalized]) {
        INGREDIENT_VARIATIONS[normalized].forEach(variation => {
            variations.add(normalizeIngredient(variation));
        });
    }

    for (const [base, variationList] of Object.entries(INGREDIENT_VARIATIONS)) {
        const normalizedVariations = variationList.map(v => normalizeIngredient(v));
        if (normalizedVariations.includes(normalized)) {
            variations.add(base);
            normalizedVariations.forEach(v => variations.add(v));
            break;
        }
    }

    return Array.from(variations);
}

// Enhanced inventory matching
function findBestInventoryMatch(ingredient, inventory) {
    if (!inventory || inventory.length === 0) return null;

    const normalizedIngredient = normalizeIngredient(ingredient);

    console.log(`[SHOPPING API] Looking for inventory match for: "${ingredient}" (normalized: "${normalizedIngredient}")`);

    // 1. EXACT MATCH
    for (const item of inventory) {
        const itemName = normalizeIngredient(item.name);
        if (itemName === normalizedIngredient && normalizedIngredient.length > 2) {
            console.log(`[SHOPPING API] ✅ EXACT MATCH: "${item.name}"`);
            return item;
        }
    }

    // 2. INTELLIGENT MATCHING
    for (const item of inventory) {
        if (canIngredientsMatch(ingredient, item.name)) {
            console.log(`[SHOPPING API] ✅ INTELLIGENT MATCH: "${item.name}" matches "${ingredient}"`);
            return item;
        }
    }

    // 3. FALLBACK PARTIAL MATCHING
    for (const item of inventory) {
        const itemName = normalizeIngredient(item.name);

        if (normalizedIngredient.length >= 4 && itemName.length >= 4) {
            if (itemName.includes(normalizedIngredient) || normalizedIngredient.includes(itemName)) {
                const shorterLength = Math.min(itemName.length, normalizedIngredient.length);
                const longerLength = Math.max(itemName.length, normalizedIngredient.length);
                const similarity = shorterLength / longerLength;

                if (similarity >= 0.75) {
                    console.log(`[SHOPPING API] ✅ FALLBACK PARTIAL MATCH: "${item.name}" similarity ${similarity.toFixed(2)}`);
                    return item;
                }
            }
        }
    }

    console.log(`[SHOPPING API] ❌ NO MATCH found for: "${ingredient}"`);
    return null;
}

// UNIFIED: Use groceryCategories for ingredient keys
function createIngredientKey(ingredient) {
    // Use the same normalization function from groceryCategories
    const normalized = normalizeIngredientForCategorization(ingredient);

    // Remove common descriptors (this logic can be simplified now)
    const cleaned = normalized
        .replace(/\b(of|the|and|or|into|cut|for|with|from|about)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    console.log(`[INGREDIENT KEY] "${ingredient}" -> "${cleaned}"`);

    // ENHANCED: Use groceryCategories knowledge for better grouping
    // Pasta normalization
    if (/\b(pasta|spaghetti|penne|fettuccine|fusilli|rigatoni|linguine|angel hair|bow tie|farfalle|macaroni|shells|rotini|gemelli|orzo|pappardelle|tagliatelle|bucatini|cavatappi|ziti|lasagna|ravioli|tortellini|gnocchi)\b/i.test(cleaned)) {
        return 'pasta';
    }

    // Specific ingredient grouping for better combination
    if (cleaned.includes('red bell pepper')) return 'red-bell-pepper';
    if (cleaned.includes('green bell pepper')) return 'green-bell-pepper';
    if (cleaned.includes('bell pepper') && !cleaned.includes('red') && !cleaned.includes('green')) return 'bell-pepper';
    if (cleaned.includes('green onion') || cleaned.includes('scallion')) return 'green-onion';
    if (cleaned.includes('red pepper flakes')) return 'red-pepper-flakes';
    if (cleaned.includes('garlic')) return 'garlic';
    if (cleaned.includes('onion') && !cleaned.includes('green') && !cleaned.includes('red')) return 'onion';

    // CRITICAL: Keep tomato products separate (from groceryCategories knowledge)
    if (cleaned.includes('tomato paste')) return 'tomato-paste';
    if (cleaned.includes('tomato sauce') || cleaned.includes('marinara')) return 'tomato-sauce';
    if (cleaned.includes('crushed tomatoes')) return 'crushed-tomatoes';
    if (cleaned.includes('diced tomatoes')) return 'diced-tomatoes';
    if (cleaned.includes('sun dried tomatoes')) return 'sun-dried-tomatoes';
    if (cleaned.includes('cherry tomatoes')) return 'cherry-tomatoes';
    if (cleaned.includes('roma tomatoes')) return 'roma-tomatoes';
    if (cleaned.includes('whole tomatoes')) return 'whole-tomatoes';
    if (cleaned.includes('fresh tomatoes')) return 'fresh-tomatoes';
    if (cleaned.includes('tomatoes') && !cleaned.includes('paste') && !cleaned.includes('sauce') && !cleaned.includes('crushed') && !cleaned.includes('diced')) return 'tomatoes';

    // Cheese variations
    if (cleaned.includes('shredded mozzarella')) return 'shredded-mozzarella';
    if (cleaned.includes('mozzarella') && !cleaned.includes('shredded')) return 'mozzarella';
    if (cleaned.includes('cheddar')) return 'cheddar';
    if (cleaned.includes('parmesan')) return 'parmesan';

    // ENHANCED BEEF CUT GROUPING
    if (cleaned.includes('cube steaks') || cleaned.includes('cubed steaks') || cleaned.includes('minute steaks')) return 'cube-steaks';
    if (cleaned.includes('ground beef') || cleaned.includes('ground chuck') || cleaned.includes('ground round')) return 'ground-beef';
    if (cleaned.includes('ribeye') || cleaned.includes('rib eye')) return 'ribeye-steak';
    if (cleaned.includes('strip steak') || cleaned.includes('new york strip') || cleaned.includes('ny strip')) return 'strip-steak';
    if (cleaned.includes('sirloin steak') || cleaned.includes('top sirloin')) return 'sirloin-steak';
    if (cleaned.includes('t-bone') || cleaned.includes('t bone')) return 't-bone-steak';
    if (cleaned.includes('porterhouse')) return 'porterhouse-steak';
    if (cleaned.includes('filet mignon') || cleaned.includes('tenderloin steak')) return 'filet-mignon';
    if (cleaned.includes('chuck roast') || cleaned.includes('pot roast')) return 'chuck-roast';
    if (cleaned.includes('chuck steak')) return 'chuck-steak';
    if (cleaned.includes('prime rib') || cleaned.includes('rib roast')) return 'prime-rib';
    if (cleaned.includes('short ribs')) return 'short-ribs';
    if (cleaned.includes('brisket')) return 'brisket';
    if (cleaned.includes('flank steak') || cleaned.includes('london broil')) return 'flank-steak';
    if (cleaned.includes('skirt steak') || cleaned.includes('fajita meat')) return 'skirt-steak';
    if (cleaned.includes('round steak') || cleaned.includes('top round') || cleaned.includes('bottom round')) return 'round-steak';
    if (cleaned.includes('rump roast')) return 'rump-roast';
    if (cleaned.includes('eye of round')) return 'eye-of-round';
    if (cleaned.includes('tri tip') || cleaned.includes('tri-tip')) return 'tri-tip';
    if (cleaned.includes('stew meat') || cleaned.includes('beef stew')) return 'stew-meat';
    if (cleaned.includes('soup bones') || cleaned.includes('marrow bones')) return 'soup-bones';

    // ENHANCED PORK CUT GROUPING
    if (cleaned.includes('pork shoulder') || cleaned.includes('boston butt') || cleaned.includes('pulled pork')) return 'pork-shoulder';
    if (cleaned.includes('pork loin') && !cleaned.includes('chop')) return 'pork-loin';
    if (cleaned.includes('pork tenderloin') || cleaned.includes('pork filet')) return 'pork-tenderloin';
    if (cleaned.includes('pork chops') || cleaned.includes('loin chops')) return 'pork-chops';
    if (cleaned.includes('baby back ribs') || cleaned.includes('back ribs')) return 'baby-back-ribs';
    if (cleaned.includes('spare ribs') || cleaned.includes('spareribs')) return 'spare-ribs';
    if (cleaned.includes('country style ribs') || cleaned.includes('country ribs')) return 'country-style-ribs';
    if (cleaned.includes('fresh ham') || cleaned.includes('leg of pork')) return 'fresh-ham';
    if (cleaned.includes('ham steak')) return 'ham-steak';
    if (cleaned.includes('pork belly')) return 'pork-belly';
    if (cleaned.includes('ground pork') || cleaned.includes('pork mince')) return 'ground-pork';
    if (cleaned.includes('italian sausage') && cleaned.includes('pork')) return 'italian-pork-sausage';
    if (cleaned.includes('pork sausage') || cleaned.includes('breakfast sausage')) return 'pork-sausage';
    if (cleaned.includes('bratwurst') || cleaned.includes('brats')) return 'bratwurst';
    if (cleaned.includes('chorizo') && cleaned.includes('pork')) return 'pork-chorizo';
    if (cleaned.includes('kielbasa') || cleaned.includes('polish sausage')) return 'kielbasa';
    if (cleaned.includes('pork hock') || cleaned.includes('ham hock')) return 'pork-hock';

// ENHANCED POULTRY CUT GROUPING
    if (cleaned.includes('whole chicken') || cleaned.includes('fryer chicken')) return 'whole-chicken';
    if (cleaned.includes('chicken breast') && !cleaned.includes('ground')) return 'chicken-breast';
    if (cleaned.includes('chicken thigh')) return 'chicken-thighs';
    if (cleaned.includes('chicken leg') || cleaned.includes('drumstick')) return 'chicken-legs';
    if (cleaned.includes('chicken wing')) return 'chicken-wings';
    if (cleaned.includes('chicken tender') || cleaned.includes('chicken strip')) return 'chicken-tenderloins';
    if (cleaned.includes('ground chicken') || cleaned.includes('chicken mince')) return 'ground-chicken';
    if (cleaned.includes('whole turkey')) return 'whole-turkey';
    if (cleaned.includes('turkey breast') && !cleaned.includes('ground')) return 'turkey-breast';
    if (cleaned.includes('turkey thigh')) return 'turkey-thighs';
    if (cleaned.includes('turkey leg') || cleaned.includes('turkey drumstick')) return 'turkey-legs';
    if (cleaned.includes('ground turkey') || cleaned.includes('turkey mince')) return 'ground-turkey';
    if (cleaned.includes('whole duck') || cleaned.includes('duckling')) return 'whole-duck';
    if (cleaned.includes('duck breast')) return 'duck-breast';
    if (cleaned.includes('duck leg')) return 'duck-legs';
    if (cleaned.includes('cornish hen') || cleaned.includes('cornish game hen')) return 'cornish-hen';


    // Oil variations
    if (cleaned.includes('sesame oil')) return 'sesame-oil';
    if (cleaned.includes('olive oil')) return 'olive-oil';
    if (cleaned.includes('vegetable oil')) return 'vegetable-oil';
    if (cleaned.includes('coconut oil')) return 'coconut-oil';

    // Asian ingredients
    if (cleaned.includes('soy sauce')) return 'soy-sauce';
    if (cleaned.includes('rice vinegar')) return 'rice-vinegar';
    if (cleaned.includes('sesame seeds')) return 'sesame-seeds';

    // Mexican ingredients
    if (cleaned.includes('enchilada sauce')) return 'enchilada-sauce';
    if (cleaned.includes('salsa')) return 'salsa';
    if (cleaned.includes('cilantro')) return 'cilantro';

    // Common ingredients
    if (cleaned.includes('white wine')) return 'white-wine';
    if (cleaned.includes('italian sausage')) return 'italian-sausage';
    if (cleaned.includes('chicken breast')) return 'chicken-breast';
    if (cleaned.includes('ground beef')) return 'ground-beef';
    if (cleaned.includes('beef sirloin')) return 'beef-sirloin';
    if (cleaned.includes('salt') && cleaned.includes('pepper')) return 'salt-and-pepper';
    if (cleaned.includes('salt') && !cleaned.includes('pepper')) return 'salt';
    if (cleaned.includes('pepper') && !cleaned.includes('salt') && !cleaned.includes('bell')) return 'pepper';
    if (cleaned.includes('cornstarch') || cleaned.includes('corn starch')) return 'cornstarch';

    return cleaned;
}

// Parse amount and unit from ingredient amount string
function parseAmountAndUnit(amountStr) {
    if (!amountStr) {
        return { amount: '', unit: '', numeric: 0, isToTaste: false, originalAmount: amountStr };
    }

    const str = String(amountStr).trim().toLowerCase();

    if (!str) {
        return { amount: '', unit: '', numeric: 0, isToTaste: false, originalAmount: amountStr };
    }

    if (str.includes('to taste')) {
        return { amount: 'to taste', unit: '', numeric: 0, isToTaste: true, originalAmount: amountStr };
    }

    const match = str.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s*(.*)$/);
    if (match) {
        const numericValue = parseFloat(match[1]);
        const unit = match[2].trim();
        return {
            amount: match[1],
            unit: unit,
            numeric: numericValue,
            isToTaste: false,
            originalAmount: amountStr
        };
    }

    const fractionMatch = str.match(/^(\d+\/\d+)\s*(.*)$/);
    if (fractionMatch) {
        const [numerator, denominator] = fractionMatch[1].split('/').map(Number);
        const numericValue = numerator / denominator;
        const unit = fractionMatch[2].trim();
        return {
            amount: fractionMatch[1],
            unit: unit,
            numeric: numericValue,
            isToTaste: false,
            originalAmount: amountStr
        };
    }

    return { amount: str, unit: '', numeric: 0, isToTaste: false, originalAmount: amountStr };
}

// Smart combination of ingredient amounts
function combineIngredientAmounts(existing, newIngredient) {
    const existingAmountStr = existing.amount ? String(existing.amount) : '';
    const newAmountStr = newIngredient.amount ? String(newIngredient.amount) : '';

    const existingParsed = parseAmountAndUnit(existingAmountStr);
    const newParsed = parseAmountAndUnit(newAmountStr);

    console.log(`Combining amounts: "${existingAmountStr}" (${existing.unit}) + "${newAmountStr}" (${newIngredient.unit})`);

    if (existingParsed.isToTaste && newParsed.isToTaste) {
        return {
            amount: 'to taste',
            unit: existing.unit || newIngredient.unit || ''
        };
    }

    if (existingParsed.isToTaste && !newParsed.isToTaste) {
        const newUnit = newIngredient.unit || newParsed.unit || '';
        const newAmountStr = newUnit ? `${newParsed.amount} ${newUnit}` : newParsed.amount;
        return {
            amount: `${newAmountStr}, to taste`,
            unit: ''
        };
    }

    if (!existingParsed.isToTaste && newParsed.isToTaste) {
        const existingUnit = existing.unit || existingParsed.unit || '';
        const existingAmountDisplay = existingUnit ? `${existingParsed.amount} ${existingUnit}` : existingParsed.amount;
        return {
            amount: `${existingAmountDisplay}, to taste`,
            unit: ''
        };
    }

    if (existingParsed.numeric > 0 && newParsed.numeric > 0) {
        const existingUnit = existing.unit || existingParsed.unit || '';
        const newUnit = newIngredient.unit || newParsed.unit || '';

        if (existingUnit === newUnit || (!existingUnit && !newUnit)) {
            const combinedAmount = existingParsed.numeric + newParsed.numeric;
            const unit = existingUnit || newUnit;

            console.log(`Combined numeric: ${existingParsed.numeric} + ${newParsed.numeric} = ${combinedAmount} ${unit}`);

            return {
                amount: combinedAmount.toString(),
                unit: unit
            };
        } else {
            const existingStr = existingUnit ? `${existingParsed.amount} ${existingUnit}` : existingParsed.amount;
            const newStr = newUnit ? `${newParsed.amount} ${newUnit}` : newParsed.amount;

            return {
                amount: `${existingStr}, ${newStr}`,
                unit: ''
            };
        }
    }

    const existingUnit = existing.unit || existingParsed.unit || '';
    const newUnit = newIngredient.unit || newParsed.unit || '';
    const existingStr = existingUnit ? `${existingParsed.amount} ${existingUnit}` : existingParsed.amount;
    const newStr = newUnit ? `${newParsed.amount} ${newUnit}` : newParsed.amount;

    return {
        amount: `${existingStr}, ${newStr}`,
        unit: ''
    };
}

// UNIFIED: Use groceryCategories categorization system with enhanced preprocessing
function categorizeIngredient(ingredientName) {
    if (!ingredientName || typeof ingredientName !== 'string') {
        return 'Other';
    }

    console.log(`[CATEGORIZATION] Input ingredient: "${ingredientName}"`);

    try {
        // Use the enhanced category suggestion system from groceryCategories
        const category = findBestCategoryMatch(ingredientName, 'Other');
        console.log(`[CATEGORIZATION] "${ingredientName}" -> "${category}"`);
        return category;
    } catch (error) {
        console.error(`[CATEGORIZATION] Error categorizing "${ingredientName}":`, error);
        return 'Other';
    }
}

// Check if inventory covers the needed amount
function checkInventoryCoverage(neededAmount, inventoryItem, packageInfo) {
    if (!inventoryItem) return false;

    const neededAmountStr = neededAmount ? String(neededAmount) : '';
    const neededMatch = neededAmountStr.match(/(\d+(?:\.\d+)?)/);
    const neededNumber = neededMatch ? parseFloat(neededMatch[1]) : 1;
    const inventoryQuantity = inventoryItem.quantity || 1;
    const inventoryUnit = (inventoryItem.unit || 'item').toLowerCase();

    console.log(`[COVERAGE CHECK] Need: "${neededAmountStr}", Have: ${inventoryQuantity} ${inventoryUnit}, Item: "${inventoryItem.name}"`);

    const itemName = normalizeIngredient(inventoryItem.name);

    // Smart coverage rules
    if (itemName.includes('pasta') ||
        ['spaghetti', 'penne', 'fettuccine', 'fusilli', 'rigatoni', 'linguine', 'macaroni', 'shells'].some(p => itemName.includes(p))) {
        console.log(`[COVERAGE CHECK] ✅ Pasta rule: Have pasta item, covers pasta need`);
        return inventoryQuantity >= 1;
    }

    if (itemName.includes('oil') && neededAmountStr && (neededAmountStr.includes('tbsp') || neededAmountStr.includes('tsp'))) {
        console.log(`[COVERAGE CHECK] ✅ Oil rule: Have oil item, covers small oil need`);
        return inventoryQuantity >= 1;
    }

    if (neededAmountStr === 'to taste' || neededAmountStr.includes('to taste')) {
        const spiceKeywords = ['salt', 'pepper', 'garlic powder', 'onion powder', 'oregano', 'basil', 'thyme'];
        if (spiceKeywords.some(spice => itemName.includes(spice))) {
            console.log(`[COVERAGE CHECK] ✅ Spice rule: Have spice, covers "to taste" need`);
            return inventoryQuantity >= 1;
        }
    }

    if (inventoryUnit !== 'item' && neededAmountStr && neededAmountStr.toLowerCase().includes(inventoryUnit)) {
        console.log(`[COVERAGE CHECK] Unit match: comparing ${neededNumber} needed vs ${inventoryQuantity} have`);
        return inventoryQuantity >= neededNumber;
    }

    if (neededNumber <= 3 && inventoryQuantity >= 1) {
        console.log(`[COVERAGE CHECK] ✅ Small amount rule: Need ${neededNumber}, have ${inventoryQuantity}`);
        return true;
    }

    if (inventoryUnit === 'item' && inventoryQuantity >= 1) {
        console.log(`[COVERAGE CHECK] ✅ Item rule: Have 1+ items of "${inventoryItem.name}"`);
        return true;
    }

    console.log(`[COVERAGE CHECK] ❌ No rule matched - need: ${neededNumber}, have: ${inventoryQuantity} ${inventoryUnit}`);
    return false;
}

// FIXED: Function to extract recipe IDs from meal plan - now properly awaits DB connection
async function getRecipeIdsFromMealPlan(mealPlanId) {
    try {
        // Ensure DB connection is established
        await connectDB();

        const mealPlan = await MealPlan.findById(mealPlanId);
        if (!mealPlan) {
            throw new Error('Meal plan not found');
        }

        const recipeIds = new Set();

        Object.values(mealPlan.meals).forEach(dayMeals => {
            if (Array.isArray(dayMeals)) {
                dayMeals.forEach(meal => {
                    if (meal.recipeId) {
                        recipeIds.add(meal.recipeId.toString());
                    }
                });
            }
        });

        return Array.from(recipeIds);
    } catch (error) {
        console.error('Error extracting recipe IDs from meal plan:', error);
        throw error;
    }
}

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipeIds: providedRecipeIds, mealPlanId } = await request.json();

        // FIXED: Establish DB connection BEFORE any database operations
        await connectDB();

        let recipeIds = providedRecipeIds;

        if (mealPlanId) {
            console.log('Processing meal plan:', mealPlanId);
            try {
                // DB connection is already established above
                recipeIds = await getRecipeIdsFromMealPlan(mealPlanId);
                console.log('Extracted recipe IDs from meal plan:', recipeIds);
            } catch (error) {
                console.error('Error processing meal plan:', error);
                return NextResponse.json({
                    error: 'Failed to process meal plan: ' + error.message
                }, { status: 400 });
            }
        }

        if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
            return NextResponse.json({
                error: 'Recipe IDs are required'
            }, { status: 400 });
        }

        const recipes = await Recipe.find({
            _id: { $in: recipeIds }
        });

        console.log('🔍 DEBUG: Recipe structure analysis');
        recipes.forEach((recipe, index) => {
            if (index < 2) { // Only log first 2 recipes to avoid spam
                console.log(`Recipe ${index + 1}: ${recipe.title}`);
                console.log('- hasIngredients:', !!recipe.ingredients);
                console.log('- ingredientsType:', typeof recipe.ingredients);
                console.log('- ingredientsLength:', recipe.ingredients?.length);
                console.log('- isArray:', Array.isArray(recipe.ingredients));
                console.log('- isMultiPart:', recipe.isMultiPart);
                console.log('- hasParts:', !!recipe.parts);
                console.log('- sampleIngredient:', recipe.ingredients?.[0]);
                if (recipe.isMultiPart && recipe.parts) {
                    console.log('- partsCount:', recipe.parts.length);
                    console.log('- firstPartIngredients:', recipe.parts[0]?.ingredients?.length);
                }
            }
        });

        if (recipes.length === 0) {
            return NextResponse.json({
                error: 'No valid recipes found'
            }, { status: 404 });
        }

        console.log(`[SHOPPING API] Found ${recipes.length} recipes for shopping list generation`);

        const userInventory = await UserInventory.findOne({
            userId: session.user.id
        });
        const inventory = userInventory ? userInventory.items : [];

        console.log(`[SHOPPING API] Found ${inventory.length} items in user inventory`);

        // Enhanced ingredient aggregation with unified categorization
        const ingredientMap = new Map();

        // ENHANCED: Better ingredient processing with debugging
        recipes.forEach((recipe, recipeIndex) => {
            console.log(`[SHOPPING API] Processing recipe ${recipeIndex + 1}/${recipes.length}: ${recipe.title}`);

            // CRITICAL FIX: Check both single-part and multi-part recipe structures
            let allRecipeIngredients = [];

            // Handle single-part recipes (legacy format)
            if (recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
                console.log(`[SHOPPING API] Found ${recipe.ingredients.length} single-part ingredients in ${recipe.title}`);
                allRecipeIngredients = [...recipe.ingredients];
            }

            // Handle multi-part recipes (new format)
            if (recipe.isMultiPart && recipe.parts && Array.isArray(recipe.parts)) {
                console.log(`[SHOPPING API] Found multi-part recipe with ${recipe.parts.length} parts in ${recipe.title}`);
                recipe.parts.forEach(part => {
                    if (part.ingredients && Array.isArray(part.ingredients)) {
                        console.log(`[SHOPPING API] Part "${part.name}" has ${part.ingredients.length} ingredients`);
                        allRecipeIngredients.push(...part.ingredients);
                    }
                });
            }

            // DEBUGGING: Log the final ingredient count
            console.log(`[SHOPPING API] Total ingredients for ${recipe.title}: ${allRecipeIngredients.length}`);

            if (allRecipeIngredients.length === 0) {
                console.log(`[SHOPPING API] ⚠️ Recipe ${recipe.title} has no ingredients - skipping`);
                return;
            }

            // Process each ingredient
            allRecipeIngredients.forEach((ingredient, ingredientIndex) => {
                try {
                    // ENHANCED: Better ingredient validation
                    if (!ingredient) {
                        console.log(`[SHOPPING API] ⚠️ Null ingredient at index ${ingredientIndex} in recipe ${recipe.title}`);
                        return;
                    }

                    // Handle different ingredient formats
                    let ingredientName;
                    let ingredientAmount = '';
                    let ingredientUnit = '';

                    if (typeof ingredient === 'string') {
                        // Simple string ingredient
                        ingredientName = ingredient;
                        console.log(`[SHOPPING API] Processing string ingredient: "${ingredientName}"`);
                    } else if (typeof ingredient === 'object') {
                        // Object ingredient
                        ingredientName = ingredient.name || ingredient.ingredient;
                        ingredientAmount = ingredient.amount || '';
                        ingredientUnit = ingredient.unit || '';

                        console.log(`[SHOPPING API] Processing object ingredient: "${ingredientName}" (${ingredientAmount} ${ingredientUnit})`);
                    } else {
                        console.log(`[SHOPPING API] ⚠️ Invalid ingredient type at index ${ingredientIndex} in recipe ${recipe.title}:`, typeof ingredient, ingredient);
                        return;
                    }

                    if (!ingredientName || typeof ingredientName !== 'string' || ingredientName.trim() === '') {
                        console.log(`[SHOPPING API] ⚠️ Invalid ingredient name at index ${ingredientIndex} in recipe ${recipe.title}:`, ingredient);
                        return;
                    }

                    // Clean the ingredient name
                    const cleanedIngredientName = ingredientName.trim();
                    const ingredientKey = createIngredientKey(cleanedIngredientName);

                    console.log(`[SHOPPING API] ✅ Processing valid ingredient: "${cleanedIngredientName}" -> key: "${ingredientKey}"`);

                    // FIXED: Ensure amounts are strings
                    let safeAmount = '';
                    if (ingredientAmount !== null && ingredientAmount !== undefined) {
                        safeAmount = String(ingredientAmount).trim();
                    }

                    let safeUnit = '';
                    if (ingredientUnit && typeof ingredientUnit === 'string') {
                        safeUnit = ingredientUnit.trim();
                    }

                    console.log(`[SHOPPING API] Amounts - Amount: "${safeAmount}", Unit: "${safeUnit}"`);

                    // Process ingredient (combine or add new)
                    if (ingredientMap.has(ingredientKey)) {
                        // Combine with existing ingredient
                        const existing = ingredientMap.get(ingredientKey);
                        existing.recipes.push(recipe.title);

                        const combinedAmounts = combineIngredientAmounts({
                            amount: existing.amount,
                            unit: existing.unit
                        }, {
                            amount: safeAmount,
                            unit: safeUnit
                        });

                        existing.amount = combinedAmounts.amount;
                        existing.unit = combinedAmounts.unit;

                        // Use the longer/more descriptive name
                        if (cleanedIngredientName.length > existing.name.length) {
                            existing.name = cleanedIngredientName;
                            existing.originalName = cleanedIngredientName;
                        }

                        console.log(`[SHOPPING API] ✅ Combined ingredient: ${existing.name} - ${existing.amount} ${existing.unit}`);
                    } else {
                        // Add new ingredient
                        // CRITICAL FIX: Use the enhanced categorization
                        const category = categorizeIngredient(cleanedIngredientName);

                        const newIngredient = {
                            name: cleanedIngredientName,
                            originalName: cleanedIngredientName,
                            normalizedName: normalizeIngredient(cleanedIngredientName),
                            amount: safeAmount,
                            unit: safeUnit,
                            category: category,
                            recipes: [recipe.title],
                            optional: ingredient.optional || false,
                            alternatives: ingredient.alternatives || [],
                            variations: getIngredientVariations(cleanedIngredientName),
                            ingredientKey: ingredientKey
                        };

                        ingredientMap.set(ingredientKey, newIngredient);

                        console.log(`[SHOPPING API] ✅ New ingredient added: ${cleanedIngredientName} - ${safeAmount} ${safeUnit} -> ${category}`);
                    }

                } catch (ingredientError) {
                    console.error(`[SHOPPING API] ❌ Error processing ingredient ${ingredientIndex} in recipe ${recipe.title}:`, ingredientError);
                    console.error(`[SHOPPING API] Ingredient data:`, ingredient);
                }
            });

            console.log(`[SHOPPING API] ✅ Completed processing ${recipe.title} - Total ingredients in map: ${ingredientMap.size}`);
        });

// DEBUGGING: Log final results before creating shopping list
        console.log(`[SHOPPING API] 🎯 Final ingredient processing results:`);
        console.log(`[SHOPPING API] - Total recipes processed: ${recipes.length}`);
        console.log(`[SHOPPING API] - Total unique ingredients: ${ingredientMap.size}`);
        console.log(`[SHOPPING API] - Ingredient map keys:`, Array.from(ingredientMap.keys()).slice(0, 10));

        if (ingredientMap.size === 0) {
            console.error(`[SHOPPING API] ❌ CRITICAL: No ingredients were processed from ${recipes.length} recipes!`);

            // Debug the first recipe structure
            if (recipes.length > 0) {
                const firstRecipe = recipes[0];
                console.error(`[SHOPPING API] 🔍 Debug first recipe structure:`, {
                    title: firstRecipe.title,
                    hasIngredients: !!firstRecipe.ingredients,
                    ingredientsType: typeof firstRecipe.ingredients,
                    ingredientsLength: firstRecipe.ingredients?.length,
                    isMultiPart: firstRecipe.isMultiPart,
                    hasParts: !!firstRecipe.parts,
                    partsLength: firstRecipe.parts?.length,
                    sampleIngredient: firstRecipe.ingredients?.[0] || (firstRecipe.parts?.[0]?.ingredients?.[0]),
                    fullRecipe: firstRecipe
                });
            }

            return NextResponse.json({
                error: 'No ingredients could be processed from the provided recipes',
                debug: {
                    recipesFound: recipes.length,
                    recipesTitles: recipes.map(r => r.title),
                    firstRecipeStructure: recipes[0] ? {
                        hasIngredients: !!recipes[0].ingredients,
                        ingredientsLength: recipes[0].ingredients?.length,
                        isMultiPart: recipes[0].isMultiPart,
                        partsLength: recipes[0].parts?.length
                    } : null
                }
            }, { status: 400 });
        }


        console.log(`[SHOPPING API] Aggregated ${ingredientMap.size} unique ingredients after combination`);

        // Enhanced inventory checking and categorization using unified system
        const shoppingListItems = [];
        const itemsByCategory = {};

        for (const [key, ingredient] of ingredientMap) {
            if (ingredient.optional) {
                console.log(`[SHOPPING API] Skipping optional ingredient: ${ingredient.name}`);
                continue;
            }

            const inventoryMatch = findBestInventoryMatch(ingredient.name, inventory);
            const category = ingredient.category;

            const hasEnoughInInventory = inventoryMatch &&
                checkInventoryCoverage(ingredient.amount, inventoryMatch);

            let displayAmount = ingredient.amount || '';
            let displayUnit = ingredient.unit || '';

            if (displayUnit && displayAmount && !displayAmount.includes(displayUnit)) {
                if (displayAmount !== 'to taste') {
                    displayAmount = `${displayAmount} ${displayUnit}`.trim();
                    displayUnit = '';
                }
            }

            const item = {
                name: ingredient.name,
                ingredient: ingredient.name,
                originalName: ingredient.originalName,
                amount: displayAmount,
                unit: displayUnit,
                category: category, // Using unified categorization
                recipes: ingredient.recipes,
                inInventory: hasEnoughInInventory,
                inventoryItem: inventoryMatch ? {
                    id: inventoryMatch._id,
                    name: inventoryMatch.name,
                    quantity: inventoryMatch.quantity,
                    unit: inventoryMatch.unit,
                    location: inventoryMatch.location,
                    expirationDate: inventoryMatch.expirationDate,
                    brand: inventoryMatch.brand,
                    // NEW: Include all price information from inventory
                    averagePrice: inventoryMatch.averagePrice || 0,
                    lowestPrice: inventoryMatch.lowestPrice || 0,
                    highestPrice: inventoryMatch.highestPrice || 0,
                    lastPurchasePrice: inventoryMatch.lastPurchasePrice || 0,
                    priceHistory: inventoryMatch.priceHistory || []
                } : null,
                // NEW: Extract and use inventory price as estimated price
                estimatedPrice: inventoryMatch?.averagePrice || inventoryMatch?.lowestPrice || 0,
                priceSource: inventoryMatch?.averagePrice > 0 ? 'inventory_average' :
                    inventoryMatch?.lowestPrice > 0 ? 'inventory_lowest' : 'none',
                needAmount: displayAmount || '1',
                haveAmount: inventoryMatch ? `${inventoryMatch.quantity} ${inventoryMatch.unit}` : '0',
                alternatives: ingredient.alternatives,
                variations: ingredient.variations,
                normalizedName: ingredient.normalizedName,
                ingredientKey: ingredient.ingredientKey,
                // NEW: Price optimization fields
                priceOptimized: (inventoryMatch?.averagePrice || 0) > 0,
                dealStatus: 'normal', // Default, can be enhanced later
                actualPrice: null // Will be filled in during shopping
            };

            shoppingListItems.push(item);

            // Group by unified category
            if (!itemsByCategory[category]) {
                itemsByCategory[category] = [];
            }
            itemsByCategory[category].push(item);
        }

        console.log(`[SHOPPING API] Generated shopping list with ${shoppingListItems.length} items across ${Object.keys(itemsByCategory).length} categories`);
        console.log(`[SHOPPING API] Categories used:`, Object.keys(itemsByCategory));

        // Validate all categories exist in our unified system
        const invalidCategories = Object.keys(itemsByCategory).filter(cat => !CategoryUtils.isValidCategory(cat));
        if (invalidCategories.length > 0) {
            console.warn(`[SHOPPING API] Invalid categories found:`, invalidCategories);
        }

        // Calculate comprehensive summary statistics
        const summary = {
            totalItems: shoppingListItems.length,
            needToBuy: shoppingListItems.filter(item => !item.inInventory).length,
            alreadyHave: shoppingListItems.filter(item => item.inInventory).length,
            inInventory: shoppingListItems.filter(item => item.inInventory).length,
            categories: Object.keys(itemsByCategory).length,
            recipeCount: recipes.length,
            optionalItemsSkipped: Array.from(ingredientMap.values()).filter(i => i.optional).length,
            ingredientsCombined: recipes.reduce((total, recipe) =>
                total + (recipe.ingredients ? recipe.ingredients.length : 0), 0) - ingredientMap.size
        };

        // Enhanced shopping list response with unified categorization metadata
        const response = {
            success: true,
            shoppingList: {
                items: itemsByCategory, // Categorized using unified system
                recipes: recipes.map(r => r.title),
                summary,
                generatedAt: new Date().toISOString(),
                source: mealPlanId ? 'meal_plan' : 'recipes',
                sourceId: mealPlanId || null,
                sourceRecipeIds: recipeIds,
                metadata: {
                    totalRecipes: recipes.length,
                    totalIngredients: ingredientMap.size,
                    inventoryItems: inventory.length,
                    categoriesUsed: Object.keys(itemsByCategory),
                    totalAvailableCategories: getAllCategoryNames().length,
                    variationsMatched: shoppingListItems.filter(item => item.variations.length > 1).length,
                    ingredientsCombined: summary.ingredientsCombined,
                    categorizationSystem: 'unified-grocery-categories-v2',
                    matchingStats: {
                        exactMatches: shoppingListItems.filter(item => item.inventoryItem).length,
                        noMatches: shoppingListItems.filter(item => !item.inventoryItem).length
                    }
                }
            }
        };

        console.log('[SHOPPING API] Enhanced shopping list generated successfully with unified categorization:', {
            totalItems: summary.totalItems,
            categories: summary.categories,
            source: response.shoppingList.source,
            categorizationSystem: response.shoppingList.metadata.categorizationSystem,
            variationsMatched: response.shoppingList.metadata.variationsMatched,
            ingredientsCombined: summary.ingredientsCombined,
            exactMatches: response.shoppingList.metadata.matchingStats.exactMatches
        });

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error generating shopping list with unified categorization:', error);
        return NextResponse.json({
            error: 'Failed to generate shopping list',
            details: error.message
        }, { status: 500 });
    }
}