// ---------- firebase init from firebaseConfig.js ----------
const auth = firebase.auth();
const db   = firebase.firestore();

// Tiny helpers
const el = (sel) => document.querySelector(sel);
const ce = (tag, cls='') => { const x=document.createElement(tag); if(cls) x.className=cls; return x; };

auth.onAuthStateChanged(async user => {
  if (!user) return location.href = 'index.html';

  const userDoc = (await db.collection('users').doc(user.uid).get()).data();
  const role = userDoc.role; // 'client' or 'freelancer'

  // Show a role‑specific form
  const postArea = el('#postSection');
  postArea.classList.remove('hidden');
  postArea.innerHTML = role === 'client'
    ? jobFormHTML()   // client posts job
    : gigFormHTML();  // freelancer posts gig
  bindForm(role);

  // Listen for data changes
  listenJobs();
  listenGigs();

  // hide gigs section for clients
  if (role === 'client') el('#gigsHeader').classList.add('hidden');
});

el('#logoutBtn').onclick = () => auth.signOut();

// ---------- HTML snippets ----------
const jobFormHTML = () => `
  <h3 class="text-xl font-bold mb-4 text-indigo-700">Post a New Job</h3>
  <form id="jobForm" class="space-y-3">
    <input name="title" placeholder="Job title" class="input w-full"/>
    <textarea name="desc" placeholder="Describe the work" class="input w-full h-24"></textarea>
    <button class="btn bg-indigo-600 hover:bg-indigo-700 text-white">Post Job</button>
  </form>`;

const gigFormHTML = () => `
  <h3 class="text-xl font-bold mb-4 text-indigo-700">Create a New Gig</h3>
  <form id="gigForm" class="space-y-3">
    <input name="title" placeholder="Gig title" class="input w-full"/>
    <textarea name="desc" placeholder="Describe your service" class="input w-full h-24"></textarea>
    <input name="price" type="number" placeholder="Starting price" class="input w-full"/>
    <button class="btn bg-indigo-600 hover:bg-indigo-700 text-white">Add Gig</button>
  </form>`;

// ---------- Form handlers ----------
function bindForm(role){
  if (role === 'client'){
    el('#jobForm').addEventListener('submit', async e=>{
      e.preventDefault();
      const {title,desc} = e.target;
      await db.collection('jobs').add({
        title: title.value, desc: desc.value,
        client: auth.currentUser.uid,
        created: firebase.firestore.FieldValue.serverTimestamp()
      });
      e.target.reset();
    });
  } else {
    el('#gigForm').addEventListener('submit', async e=>{
      e.preventDefault();
      const {title,desc,price} = e.target;
      await db.collection('gigs').add({
        title:title.value, desc:desc.value, price:+price.value,
        freelancer: auth.currentUser.uid,
        created: firebase.firestore.FieldValue.serverTimestamp()
      });
      e.target.reset();
    });
  }
}

// ---------- Real‑time listeners ----------
function listenJobs(){
  db.collection('jobs').orderBy('created','desc').onSnapshot(snap=>{
    const wrap = el('#jobsList'); wrap.innerHTML='';
    snap.forEach(doc=>{
      const j = doc.data();
      const card = ce('div','p-5 bg-white rounded-xl shadow space-y-2');
      card.innerHTML = `<h4 class="font-bold text-lg">${j.title}</h4>
                        <p class="text-sm">${j.desc}</p>`;
      // Show BID button only to freelancers
      if (j.client !== auth.currentUser.uid){
        const btn = ce('button','btn mt-2 bg-teal-600 hover:bg-teal-700 text-white text-sm');
        btn.textContent = 'Bid';
        btn.onclick = ()=> placeBid(doc.id);
        card.appendChild(btn);
      }
      wrap.appendChild(card);
    });
  });
}

function listenGigs(){
  db.collection('gigs').orderBy('created','desc').onSnapshot(snap=>{
    const wrap = el('#gigsList'); wrap.innerHTML='';
    snap.forEach(doc=>{
      const g = doc.data();
      const card = ce('div','p-5 bg-white rounded-xl shadow space-y-2');
      card.innerHTML = `<h4 class="font-bold text-lg">${g.title}</h4>
                        <p class="text-sm">${g.desc}</p>
                        <p class="font-semibold">₹${g.price}</p>`;
      wrap.appendChild(card);
    });
  });
}

// ---------- Bidding logic ----------
async function placeBid(jobId){
  const price = prompt('Your bid price?');
  const msg   = prompt('Short message:');
  if (!price) return;

  await db.collection('jobs').doc(jobId)
          .collection('bids').add({
            freelancer: auth.currentUser.uid,
            price:+price, msg,
            status:'pending',
            placed: firebase.firestore.FieldValue.serverTimestamp()
          });
  alert('Bid placed!');
}
