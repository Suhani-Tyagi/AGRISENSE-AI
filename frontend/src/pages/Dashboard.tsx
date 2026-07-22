import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  Droplets, Activity, FileText, PlusCircle,
  AlertCircle, Upload, Coins, Search, Award, TrendingUp,
  XCircle, Info, Calendar, MapPin, Loader2, Sparkles, Check, Sprout
} from 'lucide-react';
import { SoilChart } from '../components/SoilChart';
import { PriceChart } from '../components/PriceChart';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, Cell, CartesianGrid } from 'recharts';
import { VoiceInput } from '../components/VoiceInput';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { CardSkeleton, ChartSkeleton, ListSkeleton } from '../components/SkeletonLoader';

interface DashboardProps {
  token: string;
  role: string;
  userId: number;
  apiBaseUrl: string;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
}

export const Dashboard: React.FC<DashboardProps> = ({ token, role, userId, apiBaseUrl, setNotifications }) => {
  const { t, i18n } = useTranslation();

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  // --- COMMON STATES ---
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'forum'>('dashboard');

  // --- FORUM STATES ---
  const [forumQuestions, setForumQuestions] = useState<any[]>([]);
  const [forumCropFilter, setForumCropFilter] = useState('');
  const [forumRegionFilter, setForumRegionFilter] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionCrop, setNewQuestionCrop] = useState('Tomato');
  const [newQuestionRegion, setNewQuestionRegion] = useState('Rajasthan');
  const [newAnswerTexts, setNewAnswerTexts] = useState<Record<number, string>>({});
  const [forumLoading, setForumLoading] = useState(false);

  // --- PRICE ALERT STATES ---
  const [priceAlerts, setPriceAlerts] = useState<any[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<any[]>([]);
  const [newAlertCrop, setNewAlertCrop] = useState('Tomato');
  const [newAlertPrice, setNewAlertPrice] = useState('');
  const [newAlertCondition, setNewAlertCondition] = useState('above');

  // Onboarding tour states
  const [tourStep, setTourStep] = useState<number | null>(null);

  // Pagination states
  const [marketPage, setMarketPage] = useState(1);
  const marketPageSize = 5;

  const TOUR_STEPS: any = {
    farmer: [
      {
        title: "Welcome to AgriSense AI! 👋",
        title_hi: "कृषि-सेंस एआई में आपका स्वागत है! 👋",
        desc: "Tap 'Register Field' to add your farmland details and begin real-time soil & weather monitoring.",
        desc_hi: "अपनी कृषि भूमि का विवरण जोड़ने और रीयल-टाइम मिट्टी और मौसम की निगरानी शुरू करने के लिए 'खेत पंजीकृत करें' पर टैप करें।"
      },
      {
        title: "Weather Alerts & Soil Health 🌾",
        title_hi: "मौसम अलर्ट और मिट्टी का स्वास्थ्य 🌾",
        desc: "View customized pesticide spray recommendations based on local forecasts, and check live NPK / pH nutrient telemetry.",
        desc_hi: "स्थानीय मौसम पूर्वानुमानों के आधार पर अनुकूलित कीटनाशक छिड़काव सलाह देखें, और नाइट्रोजन, फॉस्फोरस, पोटाश का स्तर देखें।"
      },
      {
        title: "Crop Doctor & Marketplace 🛒",
        title_hi: "फसल चिकित्सक और बाजार 🛒",
        desc: "Scan crop leaf photos to identify diseases instantly. When harvested, easily list your crops to receive competitive offers from local buyers.",
        desc_hi: "रोगों की तुरंत पहचान करने के लिए पत्ती की तस्वीरें स्कैन करें। फसल तैयार होने पर खरीदारों से बोलियां प्राप्त करने के लिए अपनी फसल सूचीबद्ध करें।"
      }
    ],
    buyer: [
      {
        title: "Welcome to the Market Hub! 📈",
        title_hi: "बाजार केंद्र में आपका स्वागत है! 📈",
        desc: "Browse high-quality crop listings added directly by local farmers. Filter by crop name or quality grade.",
        desc_hi: "स्थानीय किसानों द्वारा सीधे सूचीबद्ध की गई उच्च गुणवत्ता वाली फसलों को ब्राउज़ करें। फसल के नाम या ग्रेड से फ़िल्टर करें।"
      },
      {
        title: "Submit Bids Easily 💬",
        title_hi: "आसानी से बोलियां लगाएं 💬",
        desc: "Tap 'Make Offer' on any listing to specify your purchase price and quantity bid directly to the seller.",
        desc_hi: "विक्रेता को अपनी खरीद मूल्य और मात्रा की पेशकश निर्दिष्ट करने के लिए किसी भी सूची पर 'ऑफर दें' पर टैप करें।"
      },
      {
        title: "Track Bids in Real-Time 🔔",
        title_hi: "वास्तविक समय में बोलियां ट्रैक करें 🔔",
        desc: "Monitor placed offers and get notified instantly when farmers accept or reject your purchases.",
        desc_hi: "लगाई गई बोलियों की निगरानी करें और किसानों द्वारा उन्हें स्वीकार या अस्वीकार किए जाने पर तुरंत सूचना प्राप्त करें।"
      }
    ],
    finance_officer: [
      {
        title: "Welcome to Agri-Credit Underwriting! 💳",
        title_hi: "कृषि-क्रेडिट अंडरराइटिंग में आपका स्वागत है! 💳",
        desc: "Manage alternative-data credit scoring for local smallholder farmers using real-time farm activities.",
        desc_hi: "वास्तविक समय की कृषि गतिविधियों का उपयोग करके स्थानीय छोटे किसानों के लिए वैकल्पिक-डेटा क्रेडिट स्कोरिंग का प्रबंधन करें।"
      },
      {
        title: "Explore FarmScores 📊",
        title_hi: "फार्मस्कोर (FarmScore) देखें 📊",
        desc: "Analyze score breakdowns based on crop tracking diligence, completed marketplace trades, and simulated credit behaviors.",
        desc_hi: "फसल स्वास्थ्य जांच, पूर्ण बाजार व्यापार, और सिमुलेटेड क्रेडिट व्यवहार के आधार पर स्कोर विश्लेषण का अध्ययन करें।"
      },
      {
        title: "Unlock Micro-Credit Loans 🔓",
        title_hi: "माइक्रो-क्रेडिट ऋण अनलॉक करें 🔓",
        desc: "Approve micro-loans tailored to each farmer's underwriting score and verify risk ratings directly.",
        desc_hi: "प्रत्येक किसान के अंडरराइटिंग स्कोर के अनुसार ऋण स्वीकृत करें और सीधे जोखिम रेटिंग की पुष्टि करें।"
      }
    ]
  };

  useEffect(() => {
    // Show onboarding tour only once per role
    const isTourDone = localStorage.getItem(`agrisense_onboarded_${role}`);
    if (!isTourDone) {
      setTourStep(0);
    } else {
      setTourStep(null);
    }
  }, [role]);

  const handleCompleteTour = () => {
    localStorage.setItem(`agrisense_onboarded_${role}`, 'true');
    setTourStep(null);
  };

  // --- FARMER STATES ---
  const [fields, setFields] = useState<any[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [selectedField, setSelectedField] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [sensorConnected, setSensorConnected] = useState(false);
  const [sensorStatusMsg, setSensorStatusMsg] = useState('');
  const [soilHistoryDays, setSoilHistoryDays] = useState(30);
  const [advisorView, setAdvisorView] = useState<'charts' | 'ndvi' | 'yield'>('charts');
  const [yieldPrediction, setYieldPrediction] = useState<any>(null);
  const [yieldLoading, setYieldLoading] = useState(false);

  // Field Registration
  const [showRegField, setShowRegField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldCrop, setNewFieldCrop] = useState('Tomato');
  const [newFieldSize, setNewFieldSize] = useState('2.5');
  const [newFieldLat, setNewFieldLat] = useState('26.9124');
  const [newFieldLng, setNewFieldLng] = useState('75.7873');

  // Weather & Alerts
  const [weather, setWeather] = useState<any>(null);

  // Crop Doctor
  const [selectedLeafFile, setSelectedLeafFile] = useState<File | null>(null);
  const [leafPreview, setLeafPreview] = useState<string | null>(null);
  const [leafSymptomText, setLeafSymptomText] = useState('');
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);

  // WhatsApp Fallback Sandbox States
  const [whatsappFrom, setWhatsappFrom] = useState('+91 98765 43210');
  const [whatsappBody, setWhatsappBody] = useState('DIAGNOSE Tomato leaf');
  const [whatsappMediaUrl, setWhatsappMediaUrl] = useState('');
  const [whatsappResponse, setWhatsappResponse] = useState('');
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [diagnosesHistory, setDiagnosesHistory] = useState<any[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);

  // Marketplace (Farmer Listings & Offers)
  const [farmerListings, setFarmerListings] = useState<any[]>([]);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [listCrop, setListCrop] = useState('Tomato');
  const [listQty, setListQty] = useState('200');
  const [listGrade, setListGrade] = useState('A');
  const [listLocation, setListLocation] = useState('Jaipur Mandi');
  const [listPrice, setListPrice] = useState('32');
  const [priceRecommendation, setPriceRecommendation] = useState<any>(null);
  
  // FarmScore
  const [creditData, setCreditData] = useState<any>(null);

  // --- BUYER STATES ---
  const [allListings, setAllListings] = useState<any[]>([]);
  const [searchCrop, setSearchCrop] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedListingForBid, setSelectedListingForBid] = useState<any>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [bidQty, setBidQty] = useState('');
  const [buyerOffers, setBuyerOffers] = useState<any[]>([]);

  // --- MFO STATES ---
  const [mfoFarmers, setMfoFarmers] = useState<any[]>([]);
  const [selectedFarmerReport, setSelectedFarmerReport] = useState<any>(null);
  const [mfoSearch, setMfoSearch] = useState('');
  const [creditAnalytics, setCreditAnalytics] = useState<any>(null);
  const [mfoView, setMfoView] = useState<'registry' | 'analytics'>('registry');

  // --- FORUM HANDLERS ---
  const fetchForumQuestions = async () => {
    setForumLoading(true);
    try {
      let url = `${apiBaseUrl}/api/forum/?`;
      if (forumCropFilter) url += `crop_type=${forumCropFilter}&`;
      if (forumRegionFilter) url += `region=${forumRegionFilter}&`;
      
      const res = await axios.get(url, axiosConfig);
      setForumQuestions(res.data);
    } catch (err: any) {
      setError("Failed to load forum Q&A.");
    } finally {
      setForumLoading(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post(`${apiBaseUrl}/api/forum/question`, {
        crop_type: newQuestionCrop,
        region: newQuestionRegion,
        question_text: newQuestionText
      }, axiosConfig);
      
      setNewQuestionText('');
      setSuccess("Question posted to Community Forum!");
      fetchForumQuestions();
    } catch (err: any) {
      setError("Failed to post question.");
    }
  };

  const handleSubmitAnswer = async (qId: number) => {
    const ansText = newAnswerTexts[qId];
    if (!ansText || !ansText.trim()) return;
    setError('');
    try {
      await axios.post(`${apiBaseUrl}/api/forum/question/${qId}/answer`, {
        answer_text: ansText
      }, axiosConfig);
      
      setNewAnswerTexts(prev => ({ ...prev, [qId]: '' }));
      setSuccess("Your response has been posted!");
      fetchForumQuestions();
    } catch (err: any) {
      setError("Failed to post answer.");
    }
  };

  useEffect(() => {
    if (activeTab === 'forum') {
      fetchForumQuestions();
    }
  }, [activeTab, forumCropFilter, forumRegionFilter]);

  // --- PRICE ALERT HANDLERS ---
  const fetchPriceAlerts = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/marketplace/alerts`, axiosConfig);
      setPriceAlerts(res.data);
    } catch (err) {}
  };

  const checkTriggeredAlerts = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/marketplace/alerts/check`, axiosConfig);
      setTriggeredAlerts(res.data);
    } catch (err) {}
  };

  const handleCreatePriceAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post(`${apiBaseUrl}/api/marketplace/alerts`, {
        crop: newAlertCrop,
        target_price: parseFloat(newAlertPrice),
        alert_type: newAlertCondition
      }, axiosConfig);
      
      setNewAlertPrice('');
      setSuccess("Price trend alert set successfully!");
      fetchPriceAlerts();
      checkTriggeredAlerts();
    } catch (err: any) {
      setError("Failed to create price alert.");
    }
  };

  const handleDeletePriceAlert = async (id: number) => {
    setError('');
    try {
      await axios.delete(`${apiBaseUrl}/api/marketplace/alerts/${id}`, axiosConfig);
      setSuccess("Price trend alert removed.");
      fetchPriceAlerts();
      checkTriggeredAlerts();
    } catch (err: any) {
      setError("Failed to delete price alert.");
    }
  };

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    fetchInitialData();
  }, [role]);

  const fetchInitialData = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (role === 'farmer') {
        // Fetch farmer's fields
        const fieldRes = await axios.get(`${apiBaseUrl}/api/fields/`, axiosConfig);
        setFields(fieldRes.data);
        if (fieldRes.data.length > 0) {
          const firstField = fieldRes.data[0];
          setSelectedFieldId(firstField.id);
          setSelectedField(firstField);
          fetchFieldDetails(firstField.id, firstField.latitude, firstField.longitude);
        } else {
          // Default weather for Jaipur if no fields
          fetchWeather(26.9124, 75.7873);
        }

        // Fetch diagnosis history
        const diagRes = await axios.get(`${apiBaseUrl}/api/diagnoses/`, axiosConfig);
        setDiagnosesHistory(diagRes.data);

        // Fetch marketplace listings (owned by this farmer)
        fetchFarmerListings();

        // Fetch Credit Score
        fetchCreditScore();

        // Fetch Price Alerts
        fetchPriceAlerts();
        checkTriggeredAlerts();
      } else if (role === 'buyer') {
        // Fetch marketplace listings
        fetchBuyerListings();
      } else if (role === 'finance_officer') {
        // Fetch all farmers for credit underwriting
        const mfoRes = await axios.get(`${apiBaseUrl}/api/credit/farmers`, axiosConfig);
        setMfoFarmers(mfoRes.data);
        try {
          const analyticsRes = await axios.get(`${apiBaseUrl}/api/credit/analytics`, axiosConfig);
          setCreditAnalytics(analyticsRes.data);
        } catch (analyticsErr) {}
      }
    } catch (err: any) {
      setError("Failed to fetch dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmerListings = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/marketplace/?status_filter=active`, axiosConfig);
      // Filter ones that belong to this farmer
      const activeOwned = res.data.filter((l: any) => l.user_id === userId);
      setFarmerListings(activeOwned);

      // Trigger notifications for new pending offers
      activeOwned.forEach((listing: any) => {
        if (listing.offers) {
          listing.offers.forEach((offer: any) => {
            if (offer.status === 'pending') {
              setNotifications((prev: any[]) => {
                const exists = prev.some(n => n.id === `offer_${offer.id}`);
                if (exists) return prev;
                return [
                  {
                    id: `offer_${offer.id}`,
                    title: 'New Bid Offer Received! 🪙',
                    desc: `${offer.buyer_name || 'A buyer'} offered ₹${offer.offered_price_per_kg}/kg for ${offer.quantity_kg}kg of your ${listing.crop}.`,
                    isRead: false,
                    timestamp: Date.now()
                  },
                  ...prev
                ];
              });
            }
          });
        }
      });

      const soldRes = await axios.get(`${apiBaseUrl}/api/marketplace/?status_filter=sold`, axiosConfig);
      const soldOwned = soldRes.data.filter((l: any) => l.user_id === userId);
      setFarmerListings(prev => [...prev, ...soldOwned]);
    } catch (err) {}
  };

  const fetchCreditScore = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/credit/score`, axiosConfig);
      setCreditData(res.data);
    } catch (err) {}
  };

  const fetchYieldPrediction = async (fieldId: number) => {
    setYieldLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/api/fields/${fieldId}/yield-prediction`, axiosConfig);
      setYieldPrediction(res.data);
    } catch (err) {
      setYieldPrediction(null);
    } finally {
      setYieldLoading(false);
    }
  };

  const fetchFieldDetails = async (fieldId: number, lat: number, lng: number) => {
    try {
      // Get field sensor details
      const detailRes = await axios.get(`${apiBaseUrl}/api/fields/${fieldId}`, axiosConfig);
      setSelectedField(detailRes.data);

      // Get NPK recommendations
      const recRes = await axios.get(`${apiBaseUrl}/api/fields/${fieldId}/recommendations`, axiosConfig);
      setRecommendations(recRes.data);

      // Get weather for this field
      fetchWeather(lat, lng);

      // Get yield prediction
      fetchYieldPrediction(fieldId);
    } catch (err) {}
  };

  const fetchWeather = async (lat: number, lng: number) => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/weather/?latitude=${lat}&longitude=${lng}`, axiosConfig);
      setWeather(res.data);
      if (res.data && res.data.alerts) {
        res.data.alerts.forEach((alert: any) => {
          setNotifications((prev: any[]) => {
            const exists = prev.some(n => n.id === `weather_${alert.id || alert.title}`);
            if (exists) return prev;
            return [
              {
                id: `weather_${alert.id || alert.title}`,
                title: `Climate Alert: ${alert.title}`,
                desc: alert.desc,
                isRead: false,
                timestamp: Date.now()
              },
              ...prev
            ];
          });
        });
      }
    } catch (err) {}
  };

  const handleFieldChange = (fieldId: number) => {
    const f = fields.find(x => x.id === fieldId);
    if (f) {
      setSelectedFieldId(fieldId);
      setSelectedField(f);
      setSensorConnected(false);
      setSensorStatusMsg('');
      fetchFieldDetails(fieldId, f.latitude, f.longitude);
    }
  };

  // --- FARMER HANDLERS ---
  const handleRegisterField = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${apiBaseUrl}/api/fields/`, {
        name: newFieldName,
        crop_type: newFieldCrop,
        size_acres: parseFloat(newFieldSize),
        latitude: parseFloat(newFieldLat),
        longitude: parseFloat(newFieldLng)
      }, axiosConfig);

      setFields(prev => [...prev, res.data]);
      setSelectedFieldId(res.data.id);
      setSelectedField(res.data);
      setShowRegField(false);
      fetchFieldDetails(res.data.id, res.data.latitude, res.data.longitude);
      setSuccess("Field registered successfully!");
      fetchCreditScore();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to register field.");
    }
  };

  const handleRecordIrrigation = async () => {
    if (!selectedFieldId) return;
    try {
      const res = await axios.post(`${apiBaseUrl}/api/fields/${selectedFieldId}/irrigate`, {}, axiosConfig);
      setSuccess(res.data.message);
      // Reload field details
      if (selectedField) {
        fetchFieldDetails(selectedFieldId, selectedField.latitude, selectedField.longitude);
      }
    } catch (err) {}
  };

  const handleConnectSensor = async () => {
    if (!selectedFieldId) return;
    try {
      const res = await axios.post(`${apiBaseUrl}/api/fields/${selectedFieldId}/connect-sensor`, {}, axiosConfig);
      setSensorConnected(true);
      setSensorStatusMsg(res.data.message);
    } catch (err) {}
  };

  // Crop Doctor Upload
  const handleLeafFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedLeafFile(file);
      setLeafPreview(URL.createObjectURL(file));
      setDiagnosisResult(null);
    }
  };

  const handleDiagnose = async () => {
    if (!selectedLeafFile) {
      setError("Please select or capture a leaf image first.");
      return;
    }
    setError('');
    setDiagLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedLeafFile);
      if (selectedFieldId) {
        formData.append("field_id", selectedFieldId.toString());
      } else {
        formData.append("crop_type_input", selectedField ? selectedField.crop_type : "Tomato");
      }

      const res = await axios.post(`${apiBaseUrl}/api/diagnoses/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      setDiagnosisResult(res.data);
      // Refresh histories and score
      const diagRes = await axios.get(`${apiBaseUrl}/api/diagnoses/`, axiosConfig);
      setDiagnosesHistory(diagRes.data);
      fetchCreditScore();
      setSuccess("Leaf diagnosed successfully!");
    } catch (err: any) {
      setError("AI Diagnosis failed. Try again.");
    } finally {
      setDiagLoading(false);
    }
  };

  const handleSendWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappLoading(true);
    setWhatsappResponse('');
    try {
      const params = new URLSearchParams();
      params.append('From', whatsappFrom);
      params.append('Body', whatsappBody);
      if (whatsappMediaUrl) {
        params.append('MediaUrl0', whatsappMediaUrl);
      }
      
      const res = await axios.post(`${apiBaseUrl}/api/webhook/whatsapp`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      setWhatsappResponse(res.data);
      // Refresh histories and score
      const diagRes = await axios.get(`${apiBaseUrl}/api/diagnoses/`, axiosConfig);
      setDiagnosesHistory(diagRes.data);
      fetchCreditScore();
      setSuccess("Simulated WhatsApp webhook executed successfully!");
    } catch (err: any) {
      setWhatsappResponse('Error sending WhatsApp: ' + (err.response?.data || err.message));
    } finally {
      setWhatsappLoading(false);
    }
  };

  // Pricing Assistant Query
  useEffect(() => {
    if (listCrop && listGrade) {
      fetchPriceRecommendation();
    }
  }, [listCrop, listGrade]);

  const fetchPriceRecommendation = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/marketplace/price-recommendation?crop=${listCrop}&grade=${listGrade}`, axiosConfig);
      setPriceRecommendation(res.data);
      setListPrice(res.data.average_mandi_price.toString());
    } catch (err) {}
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post(`${apiBaseUrl}/api/marketplace/`, {
        crop: listCrop,
        quantity_kg: parseFloat(listQty),
        quality_grade: listGrade,
        location: listLocation,
        price_per_kg: parseFloat(listPrice)
      }, axiosConfig);

      setSuccess("Harvest listed on Marketplace successfully!");
      setShowCreateListing(false);
      fetchFarmerListings();
      fetchCreditScore();
    } catch (err: any) {
      setError("Listing failed.");
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    try {
      await axios.put(`${apiBaseUrl}/api/marketplace/offers/${offerId}`, { status: 'accepted' }, axiosConfig);
      setSuccess("Bidding offer accepted! Transaction recorded.");
      fetchFarmerListings();
      fetchCreditScore();
    } catch (err) {}
  };

  const handleRejectOffer = async (offerId: number) => {
    try {
      await axios.put(`${apiBaseUrl}/api/marketplace/offers/${offerId}`, { status: 'rejected' }, axiosConfig);
      setSuccess("Offer rejected.");
      fetchFarmerListings();
    } catch (err) {}
  };

  // --- BUYER HANDLERS ---
  const fetchBuyerListings = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/marketplace/?status_filter=active`, axiosConfig);
      setAllListings(res.data);

      // Fetch buyer's placed offers
      // Simple mockup calculation: since we don't have separate buyer offer lists endpoints, we scan all active listings for buyer ID
      const allOffers: any[] = [];
      res.data.forEach((list: any) => {
        list.offers.forEach((o: any) => {
          if (o.buyer_id === userId) {
            allOffers.push({
              ...o,
              crop: list.crop,
              quality_grade: list.quality_grade,
              asking_price: list.price_per_kg,
              location: list.location
            });
          }
        });
      });
      setBuyerOffers(allOffers);
    } catch (err) {}
  };

  const handleOpenBidModal = (listing: any) => {
    setSelectedListingForBid(listing);
    setBidPrice(listing.price_per_kg.toString());
    setBidQty(listing.quantity_kg.toString());
    setShowBidModal(true);
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListingForBid) return;
    try {
      await axios.post(`${apiBaseUrl}/api/marketplace/${selectedListingForBid.id}/offers`, {
        listing_id: selectedListingForBid.id,
        offered_price_per_kg: parseFloat(bidPrice),
        quantity_kg: parseFloat(bidQty)
      }, axiosConfig);

      setSuccess("Your bid was successfully sent to the farmer!");
      setShowBidModal(false);
      fetchBuyerListings();
    } catch (err) {
      setError("Bidding failed.");
    }
  };

  // --- MFO HELPERS ---
  const filteredFarmers = mfoFarmers.filter((f: any) => 
    f.name.toLowerCase().includes(mfoSearch.toLowerCase()) ||
    f.phone.includes(mfoSearch)
  );

  return (
    <div className="space-y-6">
      
      {/* Messages */}
      {success && (
        <div className="p-4 bg-forest-100 text-forest-800 text-sm font-bold rounded-2xl border border-forest-200 dark:bg-forest-900/30 dark:text-forest-300 dark:border-forest-700/50 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-forest-600 font-bold hover:scale-110">×</button>
        </div>
      )}
      {error && (
        <div className="p-4 bg-terracotta-100 text-terracotta-800 text-sm font-bold rounded-2xl border border-terracotta-200 dark:bg-terracotta-900/30 dark:text-terracotta-400 dark:border-terracotta-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-terracotta-600 font-bold hover:scale-110">×</button>
        </div>
      )}

      {/* Global Section Tabs (Dashboard vs Community Forum) */}
      <div className="flex space-x-2 border-b border-earth-200 dark:border-forest-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition active:scale-95 ${
            activeTab === 'dashboard'
              ? 'bg-forest-600 text-white shadow'
              : 'bg-earth-100 dark:bg-forest-800 text-earth-600 dark:text-forest-300'
          }`}
        >
          🌾 Main Dashboard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('forum')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition active:scale-95 ${
            activeTab === 'forum'
              ? 'bg-forest-600 text-white shadow'
              : 'bg-earth-100 dark:bg-forest-800 text-earth-600 dark:text-forest-300'
          }`}
        >
          💬 Community Forum
        </button>
      </div>

      {/* Loading state with pulsing skeletons */}
      {loading && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 pb-2">
            <div className="h-6 bg-earth-200 dark:bg-forest-800 rounded w-1/3 animate-pulse"></div>
          </div>
          <CardSkeleton />
          <ChartSkeleton />
          <ListSkeleton />
        </div>
      )}

      {!loading && activeTab === 'dashboard' && (
        <>
          {/* ========================================================================= */}
          {/* ============================= FARMER ROLE ============================== */}
          {/* ========================================================================= */}
          {role === 'farmer' && (
            <div className="space-y-6">
              
              {/* Triggered Price Alerts Notification Banner */}
              {triggeredAlerts && triggeredAlerts.length > 0 && (
                <div className="space-y-3">
                  {triggeredAlerts.map((alert: any) => (
                    <div key={alert.id} className="p-4 bg-amber-500 text-white rounded-2xl flex items-start space-x-3 shadow-lg animate-pulse">
                      <TrendingUp className="w-6 h-6 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <h4 className="font-bold text-sm">💰 Mandi Price Trend Threshold Crossed!</h4>
                        <p className="mt-1 leading-normal opacity-90">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Climate Alert Weather Banner */}
              {weather && weather.alerts && weather.alerts.length > 0 && (
                <div className="space-y-3">
                  {weather.alerts.map((alert: any, idx: number) => (
                    <div key={idx} className="p-4 bg-terracotta-500 text-white rounded-2xl flex items-start space-x-3 shadow-lg">
                      <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 animate-bounce" />
                      <div>
                        <h4 className="font-bold text-sm">{alert.title} ({alert.title_hi})</h4>
                        <p className="text-xs mt-1 leading-normal opacity-90">{alert.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Weather Tailored Forecast */}
              <ErrorBoundary fallbackTitle="Weather Forecast Panel Failed">
                {weather && weather.forecast && (
                  <div className="card-earth">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-base font-black text-earth-900 dark:text-forest-100 flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-forest-500" />
                        <span>{t('weatherAlerts')}</span>
                      </h3>
                      {weather.is_simulated && (
                        <span className="px-2 py-0.5 bg-earth-200 text-earth-700 text-[10px] font-bold rounded-full uppercase">Simulated</span>
                      )}
                    </div>
                    
                    {/* Today's tailored spray window advice */}
                    <div className={`p-4 rounded-xl border flex items-start space-x-3 mb-4 ${
                      weather.forecast[0].ok_to_spray 
                        ? 'bg-forest-50 border-forest-200 dark:bg-forest-800/40 dark:border-forest-700' 
                        : 'bg-terracotta-50 border-terracotta-200 dark:bg-terracotta-900/10 dark:border-terracotta-800'
                    }`}>
                      <Activity className={`w-5 h-5 flex-shrink-0 mt-0.5 ${weather.forecast[0].ok_to_spray ? 'text-forest-600' : 'text-terracotta-500'}`} />
                      <div className="text-xs">
                        <strong className="font-bold text-earth-800 dark:text-forest-200 block mb-1">
                          {t('sprayPesticide')}: {weather.forecast[0].ok_to_spray ? t('goodDayToSpray') : t('avoidSpray')}
                        </strong>
                        <p className="text-earth-500 dark:text-forest-400 leading-normal">{weather.forecast[0].spray_reason}</p>
                      </div>
                    </div>

                    {/* 7-day small card list */}
                    <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
                      {weather.forecast.map((f: any, idx: number) => (
                        <div key={idx} className="flex-shrink-0 w-24 bg-earth-50 dark:bg-forest-900/50 p-3 rounded-xl border border-earth-100 dark:border-forest-800 text-center">
                          <span className="text-[10px] font-bold text-earth-400 block">{idx === 0 ? 'Today' : f.date.split('-').slice(1).join('/')}</span>
                          <span className="text-xs font-black block mt-2 text-earth-800 dark:text-forest-100">{f.temp_max}°C</span>
                          <span className="text-[10px] text-earth-500 dark:text-forest-400 block mt-1">{f.weather_desc}</span>
                          {f.rain_sum > 0 && <span className="text-[9px] font-bold text-blue-500 dark:text-blue-400 mt-1 block">🌧️ {f.rain_sum}mm</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ErrorBoundary>

              {/* Smart Soil & Irrigation Advisor */}
              <div className="card-earth">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-black text-earth-900 dark:text-forest-100 flex items-center space-x-2">
                    <Droplets className="w-5 h-5 text-forest-500" />
                    <span>{t('soilAdvisor')}</span>
                  </h3>
                  <button
                    onClick={() => setShowRegField(true)}
                    className="p-1.5 bg-forest-100 hover:bg-forest-200 text-forest-700 dark:bg-forest-700 dark:text-forest-200 rounded-full transition"
                    title={t('registerField')}
                  >
                    <PlusCircle className="w-5 h-5" />
                  </button>
                </div>

                {/* Field Selector */}
                {fields.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-earth-400 uppercase tracking-wider block mb-1">{t('fieldSelector')}</label>
                      <select
                        value={selectedFieldId || ''}
                        onChange={(e) => handleFieldChange(parseInt(e.target.value))}
                        className="input-earth text-sm font-semibold"
                      >
                        {fields.map(f => (
                          <option key={f.id} value={f.id}>{f.name} ({f.crop_type})</option>
                        ))}
                      </select>
                    </div>

                    {selectedField && (
                      <div className="grid grid-cols-3 gap-3 bg-earth-50 dark:bg-forest-900/50 p-4 rounded-xl border border-earth-100 dark:border-forest-800">
                        <div className="text-center">
                          <span className="text-[10px] font-bold text-earth-400 uppercase block">{t('soilMoisture')}</span>
                          <span className="text-lg font-black text-forest-600 dark:text-forest-400 block mt-1">
                            {selectedField.sensor_readings?.length > 0 
                              ? `${selectedField.sensor_readings[selectedField.sensor_readings.length - 1].soil_moisture}%` 
                              : '60%'}
                          </span>
                        </div>
                        <div className="text-center border-x border-earth-200 dark:border-forest-700">
                          <span className="text-[10px] font-bold text-earth-400 uppercase block">{t('phLevel')}</span>
                          <span className="text-lg font-black text-earth-800 dark:text-forest-100 block mt-1">
                            {selectedField.sensor_readings?.length > 0 
                              ? selectedField.sensor_readings[selectedField.sensor_readings.length - 1].ph 
                              : '6.5'}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] font-bold text-earth-400 uppercase block">Land Size</span>
                          <span className="text-sm font-bold text-earth-800 dark:text-forest-100 block mt-1">
                            {selectedField.size_acres} Acres
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Sensor controls */}
                    <div className="flex space-x-2 justify-center">
                      <button
                        onClick={handleRecordIrrigation}
                        className="btn-primary flex-1 text-xs py-2 px-3 rounded-lg"
                      >
                        {t('irrigateButton')}
                      </button>
                      <button
                        onClick={handleConnectSensor}
                        className={`flex-1 text-xs py-2 px-3 rounded-lg font-semibold border transition ${
                          sensorConnected 
                            ? 'bg-forest-100 text-forest-700 border-forest-200 dark:bg-forest-900/50 dark:text-forest-300 dark:border-forest-700' 
                            : 'bg-earth-100 hover:bg-earth-200 text-earth-700 border-earth-200 dark:bg-forest-700 dark:text-forest-200 dark:border-forest-600'
                        }`}
                      >
                        {sensorConnected ? t('sensorConnected') : t('connectSensor')}
                      </button>
                    </div>

                    {sensorStatusMsg && (
                      <p className="text-[11px] text-forest-600 dark:text-forest-400 leading-normal italic text-center">
                        {sensorStatusMsg}
                      </p>
                    )}

                    {/* Soil/NPK Recommendations */}
                    {recommendations && (
                      <div className="space-y-3 mt-4 border-t border-earth-100 dark:border-forest-800 pt-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500">{t('irrigationAdvice')}</h4>
                        <p className="text-xs text-earth-800 dark:text-forest-100 bg-earth-100 dark:bg-forest-700/50 p-3 rounded-lg leading-normal">
                          {recommendations.irrigation_advice}
                        </p>
                        
                        <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500 pt-2">{t('fertilizerAdvice')}</h4>
                        <div className="space-y-2">
                          {recommendations.fertilizer_status.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-white dark:bg-forest-900 rounded-lg border border-earth-200 dark:border-forest-800">
                              <div>
                                <span className="font-semibold text-earth-800 dark:text-forest-200">{item.nutrient}</span>
                                <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded font-bold ${
                                  item.status === 'Deficient' 
                                    ? 'bg-terracotta-100 text-terracotta-800 dark:bg-terracotta-900/20 dark:text-terracotta-400' 
                                    : 'bg-forest-100 text-forest-800 dark:bg-forest-900/40 dark:text-forest-400'
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                              <span className="text-earth-500 dark:text-forest-400 text-right">{item.advice}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* View Selector Toggle Tabs */}
                    {selectedField && (
                      <div className="flex space-x-1 bg-earth-100 dark:bg-forest-750 p-1 rounded-xl mb-4 border border-earth-200 dark:border-forest-700 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => setAdvisorView('charts')}
                          className={`flex-1 text-xs py-2 px-3 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 ${
                            advisorView === 'charts'
                              ? 'bg-white text-forest-700 dark:bg-forest-800 dark:text-forest-100 shadow-sm'
                              : 'text-earth-500 hover:text-earth-800 dark:hover:text-forest-200'
                          }`}
                        >
                          <span>📊 Charts</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdvisorView('ndvi')}
                          className={`flex-1 text-xs py-2 px-3 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 ${
                            advisorView === 'ndvi'
                              ? 'bg-white text-forest-700 dark:bg-forest-800 dark:text-forest-100 shadow-sm'
                              : 'text-earth-500 hover:text-earth-800 dark:hover:text-forest-200'
                          }`}
                        >
                          <span>🛰️ NDVI</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdvisorView('yield')}
                          className={`flex-1 text-xs py-2 px-3 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 ${
                            advisorView === 'yield'
                              ? 'bg-white text-forest-700 dark:bg-forest-800 dark:text-forest-100 shadow-sm'
                              : 'text-earth-500 hover:text-earth-800 dark:hover:text-forest-200'
                          }`}
                        >
                          <span>🌾 Yield</span>
                        </button>
                      </div>
                    )}

                    {/* Conditional Advisor Views */}
                    {selectedField && selectedField.sensor_readings && advisorView === 'charts' && (
                      <div className="space-y-4 pt-4 border-t border-earth-100 dark:border-forest-800">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500">Historical Soil Trends</h4>
                          <div className="flex space-x-1 bg-earth-100 dark:bg-forest-700 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => setSoilHistoryDays(30)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md transition ${soilHistoryDays === 30 ? 'bg-white dark:bg-forest-800 text-forest-600' : 'text-earth-500'}`}
                            >
                              30 Days
                            </button>
                            <button
                              type="button"
                              onClick={() => setSoilHistoryDays(90)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md transition ${soilHistoryDays === 90 ? 'bg-white dark:bg-forest-800 text-forest-600' : 'text-earth-500'}`}
                            >
                              90 Days
                            </button>
                          </div>
                        </div>
                        <ErrorBoundary fallbackTitle="Soil Analytics Chart Failed">
                          <SoilChart data={selectedField.sensor_readings} days={soilHistoryDays} />
                        </ErrorBoundary>
                      </div>
                    )}

                    {selectedField && advisorView === 'ndvi' && (
                      <div className="space-y-4 pt-4 border-t border-earth-100 dark:border-forest-800">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500">Satellite NDVI Canopy Health</h4>
                            <span className="text-[9px] text-earth-450 dark:text-forest-400 block font-mono">
                              GPS: {selectedField.latitude.toFixed(4)}, {selectedField.longitude.toFixed(4)}
                            </span>
                          </div>
                          <span className="text-[10px] bg-forest-100 text-forest-800 dark:bg-forest-900/50 dark:text-forest-300 px-2 py-0.5 rounded font-bold">
                            Sentinel-2 Active
                          </span>
                        </div>

                        {/* Simulated NDVI Grid Map */}
                        <div className="relative w-full aspect-square max-w-sm mx-auto bg-earth-200 dark:bg-forest-950 rounded-2xl overflow-hidden border border-earth-300 dark:border-forest-800 flex flex-col justify-between p-2 shadow-inner">
                          {/* Simulated satellite photography background with grid overlay */}
                          <div 
                            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay" 
                            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80')` }}
                          ></div>
                          
                          {/* 5x5 grid of NDVI color overlay */}
                          <div className="grid grid-cols-5 gap-1 w-full h-full relative z-10 p-1">
                            {[...Array(25)].map((_, idx) => {
                              // Simulate distinct NDVI values per cell using cell index and field id
                              const seed = (idx + selectedField.id * 7) % 5;
                              let ndviVal = 0.3 + (seed * 0.15);
                              if (ndviVal > 0.95) ndviVal = 0.95;
                              
                              let colorClass = "bg-amber-700/60"; // brown/low
                              let label = "Low Health";
                              if (ndviVal >= 0.45 && ndviVal < 0.7) {
                                colorClass = "bg-yellow-500/60"; // yellow/average
                                label = "Moderate Health";
                              } else if (ndviVal >= 0.7) {
                                colorClass = "bg-green-600/70"; // green/excellent
                                label = "Excellent Canopy";
                              }

                              return (
                                <div
                                  key={idx}
                                  title={`Cell ${idx + 1}: NDVI ${ndviVal.toFixed(2)} (${label})`}
                                  className={`${colorClass} rounded transition hover:scale-105 hover:border hover:border-white hover:z-20 flex items-center justify-center text-[9px] font-bold text-white font-mono cursor-pointer`}
                                  onClick={() => {
                                    setSuccess(`Field Zone ${idx + 1} Selected - Estimated NDVI: ${ndviVal.toFixed(2)} (${label})`);
                                  }}
                                >
                                  <span>{ndviVal.toFixed(2)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* NDVI Legend scale bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px] font-bold text-earth-505 dark:text-forest-300">
                            <span>0.0 (Poor/Dry Soil)</span>
                            <span>0.5 (Moderate Canopy)</span>
                            <span>1.0 (Optimal Health)</span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-amber-800 via-yellow-500 to-green-600 border border-earth-300 dark:border-forest-800"></div>
                        </div>
                      </div>
                    )}

                    {selectedField && advisorView === 'yield' && (
                      <div className="space-y-4 pt-4 border-t border-earth-100 dark:border-forest-800 animate-fade-in text-xs">
                        {yieldLoading ? (
                          <ListSkeleton />
                        ) : yieldPrediction ? (
                          <div className="space-y-4">
                            {/* Forecast metrics cards */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-forest-50/50 dark:bg-forest-900/30 border border-forest-100 dark:border-forest-850 rounded-2xl">
                                <span className="text-[10px] text-earth-500 uppercase font-black block">Yield Estimate</span>
                                <strong className="text-sm font-black text-forest-700 dark:text-forest-300">
                                  {yieldPrediction.min_yield_kg.toLocaleString()} - {yieldPrediction.max_yield_kg.toLocaleString()} kg
                                </strong>
                                <span className="text-[9px] text-earth-450 block mt-1">Based on {yieldPrediction.size_acres} acres of {yieldPrediction.crop_type}</span>
                              </div>
                              <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50 rounded-2xl">
                                <span className="text-[10px] text-earth-500 uppercase font-black block">Est. Revenue (INR)</span>
                                <strong className="text-sm font-black text-sky-700 dark:text-sky-350">
                                  ₹{yieldPrediction.min_revenue_inr.toLocaleString()} - ₹{yieldPrediction.max_revenue_inr.toLocaleString()}
                                </strong>
                                <span className="text-[9px] text-earth-450 block mt-1">At average market rates</span>
                              </div>
                            </div>

                            {/* Confidence rating and factors */}
                            <div className="p-4 bg-earth-50/50 dark:bg-forest-900/20 border border-earth-150 dark:border-forest-850 rounded-2xl space-y-3">
                              <div className="flex justify-between items-center pb-2 border-b border-earth-200/50 dark:border-forest-800">
                                <strong className="font-bold text-earth-750 dark:text-forest-100">Prediction Confidence</strong>
                                <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                                  yieldPrediction.confidence_rating === 'High' 
                                    ? 'bg-forest-100 text-forest-800' 
                                    : yieldPrediction.confidence_rating === 'Medium' 
                                      ? 'bg-amber-100 text-amber-800' 
                                      : 'bg-terracotta-100 text-terracotta-800'
                                }`}>
                                  {yieldPrediction.confidence_rating}
                                </span>
                              </div>

                              <div className="space-y-2">
                                <span className="text-[10px] font-black text-earth-450 uppercase block">Yield Analysis Factors</span>
                                <ul className="space-y-1.5">
                                  {yieldPrediction.breakdown_factors.map((factor: string, idx: number) => (
                                    <li key={idx} className="flex items-start space-x-2 text-earth-650 dark:text-forest-200">
                                      <span className="text-forest-500 font-bold">✓</span>
                                      <span className="leading-normal">{factor}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-earth-500 italic text-center py-4">No yield prediction details available.</p>
                        )}
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="text-center py-8 bg-earth-50/50 dark:bg-forest-900/10 rounded-2xl border border-dashed border-earth-200 dark:border-forest-800 p-6 flex flex-col items-center space-y-3 transition duration-300 hover:scale-[1.01]">
                    <MapPin className="w-10 h-10 text-forest-500 animate-bounce" />
                    <p className="text-xs font-bold text-earth-800 dark:text-forest-200">No farmlands registered yet</p>
                    <p className="text-[11px] text-earth-450 dark:text-forest-400 max-w-xs leading-normal">
                      Register your field to connect live IoT sensor feeds and unlock smart fertilizer recommendations.
                    </p>
                    <button onClick={() => setShowRegField(true)} className="btn-primary text-xs py-2 px-4 rounded-xl flex items-center space-x-1.5 active:scale-95 transition">
                      <PlusCircle className="w-4 h-4" />
                      <span>{t('registerField')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Field Registration Modal/Form */}
              {showRegField && (
                <div className="card-earth border-2 border-forest-300 dark:border-forest-600">
                  <h3 className="text-sm font-bold text-earth-900 dark:text-forest-100 mb-4">{t('registerField')}</h3>
                  <form onSubmit={handleRegisterField} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-earth-400 block mb-1">{t('fieldName')} *</label>
                        <input
                          type="text"
                          required
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          placeholder="e.g. West Meadow"
                          className="input-earth text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-earth-400 block mb-1">{t('cropType')} *</label>
                        <select
                          value={newFieldCrop}
                          onChange={(e) => setNewFieldCrop(e.target.value)}
                          className="input-earth text-xs"
                        >
                          <option value="Tomato">Tomato</option>
                          <option value="Wheat">Wheat</option>
                          <option value="Rice">Rice</option>
                          <option value="Maize">Maize</option>
                          <option value="Cotton">Cotton</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-earth-400 block mb-1">{t('fieldSize')} *</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={newFieldSize}
                          onChange={(e) => setNewFieldSize(e.target.value)}
                          className="input-earth text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-earth-400 block mb-1">{t('latitude')} *</label>
                        <input
                          type="number"
                          step="0.0001"
                          required
                          value={newFieldLat}
                          onChange={(e) => setNewFieldLat(e.target.value)}
                          className="input-earth text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-earth-400 block mb-1">{t('longitude')} *</label>
                        <input
                          type="number"
                          step="0.0001"
                          required
                          value={newFieldLng}
                          onChange={(e) => setNewFieldLng(e.target.value)}
                          className="input-earth text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <button type="submit" className="btn-primary text-xs flex-1 py-2 px-3 rounded-lg">Register</button>
                      <button type="button" onClick={() => setShowRegField(false)} className="btn-secondary text-xs flex-1 py-2 px-3 rounded-lg">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* AI Crop Doctor (Disease detection) */}
              <div className="card-earth">
                <h3 className="text-base font-black text-earth-900 dark:text-forest-100 flex items-center space-x-2 mb-4">
                  <Activity className="w-5 h-5 text-forest-500 animate-pulse" />
                  <span>{t('cropDoctor')}</span>
                </h3>

                <div className="space-y-4">
                  {/* Upload container */}
                  <div className="border-2 border-dashed border-earth-200 dark:border-forest-700 rounded-2xl p-6 text-center hover:bg-earth-50 dark:hover:bg-forest-900/30 transition duration-150 relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLeafFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-10 h-10 text-earth-400 mx-auto mb-3" />
                    <p className="text-xs font-bold text-earth-700 dark:text-forest-200 mb-1">{t('dragDrop')}</p>
                    <p className="text-[10px] text-earth-400">Supports PNG, JPG, JPEG (Camera/Gallery)</p>
                  </div>

                  {/* Leaf preview and Voice Symptom entry */}
                  {leafPreview && (
                    <div className="space-y-4 bg-earth-50 dark:bg-forest-900/50 p-4 rounded-xl border border-earth-100 dark:border-forest-800">
                      <img src={leafPreview} alt="Leaf preview" className="w-full h-44 object-cover rounded-lg border border-earth-200 dark:border-forest-700" />
                      
                      {/* Voice input component for leaf symptoms */}
                      <VoiceInput
                        context="crop"
                        placeholderText="Speak symptoms / लक्षण बताएं"
                        onTranscript={(text) => setLeafSymptomText(text)}
                      />

                      <textarea
                        value={leafSymptomText}
                        onChange={(e) => setLeafSymptomText(e.target.value)}
                        placeholder="Tell AgriSense about leaf conditions (e.g. brown rust spots, yellow leaves)..."
                        className="input-earth text-xs h-20"
                      />

                      <button
                        onClick={handleDiagnose}
                        disabled={diagLoading}
                        className="btn-primary w-full text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1"
                      >
                        {diagLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{t('diagnose')}</span>
                      </button>
                    </div>
                  )}

                  {/* Diagnosis results */}
                  {diagnosisResult && (
                    <div className="bg-forest-50 dark:bg-forest-800/40 p-4 rounded-xl border border-forest-200 dark:border-forest-700 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-forest-600 dark:text-forest-400">Diagnosis Report</span>
                          <h4 className="text-sm font-black text-earth-900 dark:text-forest-100">{diagnosisResult.disease_name}</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          diagnosisResult.severity === 'high' 
                            ? 'bg-terracotta-100 text-terracotta-800 dark:bg-terracotta-900/30 dark:text-terracotta-400'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {diagnosisResult.severity} Severity
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white dark:bg-forest-900 p-2.5 rounded-lg border border-earth-150 dark:border-forest-800">
                          <span className="text-[10px] text-earth-400 block">{t('costEstimate')}</span>
                          <span className="font-black text-earth-800 dark:text-forest-200">₹{diagnosisResult.cost_estimate} INR</span>
                        </div>
                        <div className="bg-white dark:bg-forest-900 p-2.5 rounded-lg border border-earth-150 dark:border-forest-800">
                          <span className="text-[10px] text-earth-400 block">{t('urgencyDays')}</span>
                          <span className="font-black text-terracotta-500">{diagnosisResult.urgency_days} Days</span>
                        </div>
                      </div>

                      <div className="text-xs space-y-2 pt-2 border-t border-forest-200/50 dark:border-forest-750">
                        <div>
                          <strong className="font-bold text-earth-700 dark:text-forest-300 block">{t('treatmentsOrganic')}</strong>
                          <p className="text-earth-600 dark:text-forest-400 mt-0.5 leading-normal">{diagnosisResult.treatments_organic}</p>
                        </div>
                        <div>
                          <strong className="font-bold text-earth-700 dark:text-forest-300 block">{t('treatmentsChemical')}</strong>
                          <p className="text-earth-600 dark:text-forest-400 mt-0.5 leading-normal">{diagnosisResult.treatments_chemical}</p>
                        </div>
                        <div>
                          <strong className="font-bold text-earth-700 dark:text-forest-300 block">{t('notes')}</strong>
                          <p className="text-earth-500 dark:text-forest-400 mt-0.5 leading-normal italic">{diagnosisResult.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Diagnosis history summary */}
                  <div className="pt-4 border-t border-earth-100 dark:border-forest-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500 mb-3">{t('diseaseHistory')}</h4>
                    {diagnosesHistory.length > 0 ? (
                      <div className="space-y-2">
                        {diagnosesHistory.slice(0, 3).map((diag, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs p-3 bg-earth-50 dark:bg-forest-900/30 rounded-xl border border-earth-100 dark:border-forest-850">
                            <div>
                              <span className="font-bold text-earth-800 dark:text-forest-200 block">{diag.disease_name}</span>
                              <span className="text-[10px] text-earth-400">{new Date(diag.created_at).toLocaleDateString()}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                              diag.severity === 'high' ? 'bg-terracotta-100 text-terracotta-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {diag.severity}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-earth-50/50 dark:bg-forest-900/10 rounded-2xl border border-dashed border-earth-200 dark:border-forest-800 p-4 flex flex-col items-center space-y-2">
                        <Sprout className="w-8 h-8 text-forest-400 animate-pulse" />
                        <p className="text-xs font-bold text-earth-800 dark:text-forest-200">{t('noHistory')}</p>
                        <p className="text-[10px] text-earth-450 dark:text-forest-400 max-w-xs leading-normal">
                          Snap or upload a crop leaf image above to analyze plant diseases instantly.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* WhatsApp Fallback Channel Sandbox */}
              <div className="card-earth">
                <h3 className="text-base font-black text-earth-900 dark:text-forest-100 flex items-center space-x-2 mb-2">
                  <span className="p-1 bg-forest-100 dark:bg-forest-800 rounded-lg text-forest-600 dark:text-forest-300">💬</span>
                  <span>WhatsApp Fallback Sandbox</span>
                </h3>
                <p className="text-[11px] text-earth-500 dark:text-forest-400 mb-4 leading-normal font-medium">
                  Simulate feature phone SMS/WhatsApp crop doctor diagnosis queries. Send a text like "DIAGNOSE Tomato leaf" along with a photo URL.
                </p>

                <form onSubmit={handleSendWhatsapp} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-earth-700 dark:text-forest-300 mb-1">Sender Phone Number</label>
                    <input
                      type="text"
                      required
                      value={whatsappFrom}
                      onChange={(e) => setWhatsappFrom(e.target.value)}
                      placeholder="e.g. +919876543210"
                      className="w-full bg-earth-50 dark:bg-forest-900 border border-earth-200 dark:border-forest-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-forest-500 dark:text-forest-100 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-earth-700 dark:text-forest-300 mb-1">Text Message Body</label>
                    <textarea
                      required
                      rows={2}
                      value={whatsappBody}
                      onChange={(e) => setWhatsappBody(e.target.value)}
                      placeholder="e.g. Tomato leaf dry spots"
                      className="w-full bg-earth-50 dark:bg-forest-900 border border-earth-200 dark:border-forest-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-forest-500 dark:text-forest-100 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-earth-700 dark:text-forest-300 mb-1">Simulated Image Attachment URL (Optional)</label>
                    <input
                      type="url"
                      value={whatsappMediaUrl}
                      onChange={(e) => setWhatsappMediaUrl(e.target.value)}
                      placeholder="https://example.com/leaf.jpg"
                      className="w-full bg-earth-50 dark:bg-forest-900 border border-earth-200 dark:border-forest-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-forest-500 dark:text-forest-100 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={whatsappLoading}
                    className="btn-primary w-full py-2.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition active:scale-95 disabled:opacity-50"
                  >
                    {whatsappLoading ? 'Processing SMS...' : 'Send WhatsApp Message'}
                  </button>
                </form>

                {whatsappResponse && (
                  <div className="mt-4 p-4 bg-earth-900 dark:bg-black/40 text-green-400 dark:text-green-300 font-mono text-[10px] rounded-xl border border-earth-850 dark:border-forest-900 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {whatsappResponse}
                  </div>
                )}
              </div>

              {/* Fair-Price Marketplace (Farmer listing/offers) */}
              <div className="card-earth">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-black text-earth-900 dark:text-forest-100 flex items-center space-x-2">
                    <Coins className="w-5 h-5 text-forest-500" />
                    <span>{t('marketplace')}</span>
                  </h3>
                  <button
                    onClick={() => setShowCreateListing(true)}
                    className="p-1.5 bg-forest-100 hover:bg-forest-200 text-forest-700 dark:bg-forest-700 dark:text-forest-200 rounded-full transition"
                    title={t('createListing')}
                  >
                    <PlusCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Create Listing Form overlay */}
                  {showCreateListing && (
                    <div className="p-4 bg-earth-50 dark:bg-forest-900 rounded-2xl border border-earth-200 dark:border-forest-750 space-y-4">
                      <h4 className="text-sm font-bold text-earth-900 dark:text-forest-100">{t('createListing')}</h4>
                      
                      {/* Voice assistant for marketplace listing */}
                      <VoiceInput
                        context="market"
                        placeholderText="Speak harvest details / फसल जानकारी बताएं"
                        onTranscript={(text) => {
                          // Simple parser for mockup speech
                          // "List two hundred kilograms of Grade A Tomatoes at Jaipur Mandi"
                          const lower = text.toLowerCase();
                          if (lower.includes("wheat")) setListCrop("Wheat");
                          if (lower.includes("tomato")) setListCrop("Tomato");
                          if (lower.includes("rice")) setListCrop("Rice");
                          if (lower.includes("cotton")) setListCrop("Cotton");
                          
                          if (lower.includes("grade a")) setListGrade("A");
                          if (lower.includes("grade b")) setListGrade("B");
                          
                          // match numbers
                          const q_match = lower.match(/(\d+)\s*kilogram/);
                          if (q_match) setListQty(q_match[1]);
                          
                          const p_match = lower.match(/at\s*(\d+)\s*rupees/);
                          if (p_match) setListPrice(p_match[1]);
                        }}
                      />

                      <form onSubmit={handleCreateListing} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-earth-400 block mb-1">{t('crop')} *</label>
                            <select
                              value={listCrop}
                              onChange={(e) => setListCrop(e.target.value)}
                              className="input-earth text-xs"
                            >
                              <option value="Tomato">Tomato</option>
                              <option value="Wheat">Wheat</option>
                              <option value="Rice">Rice</option>
                              <option value="Maize">Maize</option>
                              <option value="Cotton">Cotton</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-earth-400 block mb-1">{t('qualityGrade')} *</label>
                            <select
                              value={listGrade}
                              onChange={(e) => setListGrade(e.target.value)}
                              className="input-earth text-xs"
                            >
                              <option value="A">Grade A (High)</option>
                              <option value="B">Grade B (Medium)</option>
                              <option value="C">Grade C (Low)</option>
                            </select>
                          </div>
                        </div>

                        {/* Price assistant information card */}
                        {priceRecommendation && (
                          <div className="p-3 bg-forest-50 dark:bg-forest-900 border border-forest-150 dark:border-forest-800 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-bold text-forest-600 flex items-center space-x-1">
                              <Sparkles className="w-3.5 h-3.5 animate-spin" />
                              <span>{t('aiPricing')}</span>
                            </span>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-earth-500">{t('recommendedRange')}:</span>
                              <strong className="font-bold text-earth-850 dark:text-forest-200">
                                ₹{priceRecommendation.recommended_min_price} - ₹{priceRecommendation.recommended_max_price} / kg
                              </strong>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-earth-400">{t('mandiTrend')}:</span>
                              <span className="text-forest-600 font-bold">{priceRecommendation.market_trend}</span>
                            </div>
                            <p className="text-[10px] text-earth-500 leading-normal border-t border-earth-100 dark:border-forest-800 pt-1">
                              {priceRecommendation.explain_plain}
                            </p>
                            <ErrorBoundary fallbackTitle="Price Trend Chart Failed">
                              <PriceChart history={priceRecommendation.price_history_5weeks} crop={listCrop} />
                            </ErrorBoundary>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-earth-400 block mb-1">{t('quantity')} *</label>
                            <input
                              type="number"
                              required
                              value={listQty}
                              onChange={(e) => setListQty(e.target.value)}
                              className="input-earth text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-earth-400 block mb-1">{t('askingPrice')} *</label>
                            <input
                              type="number"
                              required
                              value={listPrice}
                              onChange={(e) => setListPrice(e.target.value)}
                              className="input-earth text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-earth-400 block mb-1">{t('location')} *</label>
                          <input
                            type="text"
                            required
                            value={listLocation}
                            onChange={(e) => setListLocation(e.target.value)}
                            className="input-earth text-xs"
                          />
                        </div>

                        <div className="flex space-x-2 pt-2">
                          <button type="submit" className="btn-primary text-xs flex-1 py-2 px-3 rounded-lg">List Produce</button>
                          <button type="button" onClick={() => setShowCreateListing(false)} className="btn-secondary text-xs flex-1 py-2 px-3 rounded-lg">Cancel</button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Active / Sold Listings & Bids */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500">Your Sales Dashboard</h4>
                    {farmerListings.length > 0 ? (
                      <div className="space-y-3">
                        {farmerListings.map((listing, idx) => (
                          <div key={idx} className="p-4 bg-earth-50 dark:bg-forest-900 rounded-xl border border-earth-150 dark:border-forest-800 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  listing.status === 'sold' ? 'bg-earth-200 text-earth-700' : 'bg-forest-500 text-white'
                                }`}>
                                  {listing.status}
                                </span>
                                <h4 className="text-sm font-black text-earth-900 dark:text-forest-100 mt-1">
                                  {listing.quantity_kg}kg {listing.crop} (Grade {listing.quality_grade})
                                </h4>
                                <span className="text-[10px] text-earth-400 block mt-0.5 flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {listing.location}
                                </span>
                              </div>
                              <span className="text-sm font-black text-earth-850 dark:text-forest-200">₹{listing.price_per_kg}/kg</span>
                            </div>

                            {/* Offers/Bids details */}
                            {listing.offers && listing.offers.length > 0 && (
                              <div className="border-t border-earth-150 dark:border-forest-800 pt-2 space-y-2">
                                <span className="text-[10px] font-bold text-earth-500 uppercase block">{t('offersReceived')}</span>
                                {listing.offers.map((offer: any, oIdx: number) => (
                                  <div key={oIdx} className="flex items-center justify-between p-2.5 bg-white dark:bg-forest-800 rounded-lg border border-earth-100 dark:border-forest-750 text-xs">
                                    <div>
                                      <strong className="font-bold text-earth-800 dark:text-forest-200 block">{offer.buyer_name}</strong>
                                      <span className="text-[10px] text-earth-500">Offered ₹{offer.offered_price_per_kg}/kg for {offer.quantity_kg}kg</span>
                                    </div>
                                    
                                    {offer.status === 'pending' ? (
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={() => handleAcceptOffer(offer.id)}
                                          className="p-1 bg-forest-100 hover:bg-forest-200 text-forest-700 dark:bg-forest-700 dark:text-forest-200 rounded transition"
                                          title="Accept Offer"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleRejectOffer(offer.id)}
                                          className="p-1 bg-terracotta-100 hover:bg-terracotta-200 text-terracotta-700 dark:bg-terracotta-900/30 dark:text-terracotta-400 rounded transition"
                                          title="Reject Offer"
                                        >
                                          <XCircle className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                        offer.status === 'accepted' ? 'bg-forest-100 text-forest-800' : 'bg-earth-200 text-earth-500'
                                      }`}>
                                        {offer.status}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-earth-50/50 dark:bg-forest-900/10 rounded-2xl border border-dashed border-earth-200 dark:border-forest-800 p-4 flex flex-col items-center space-y-2">
                        <Coins className="w-8 h-8 text-forest-400 animate-pulse" />
                        <p className="text-xs font-bold text-earth-800 dark:text-forest-200">{t('noListings')}</p>
                        <p className="text-[10px] text-earth-450 dark:text-forest-400 max-w-xs leading-normal">
                          List your harvests above to start receiving fair purchase bids from local buyers.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Marketplace Price Trend Alerts Setup */}
              <div className="card-earth">
                <h3 className="text-base font-black text-earth-900 dark:text-forest-100 flex items-center space-x-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-forest-500" />
                  <span>Price Trend Alerts / मूल्य अलर्ट</span>
                </h3>

                <div className="space-y-4 text-xs">
                  {/* Create price alert form */}
                  <form onSubmit={handleCreatePriceAlert} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-earth-50 dark:bg-forest-900/50 p-4 rounded-2xl border border-earth-150 dark:border-forest-800">
                    <div>
                      <label className="block font-bold text-earth-700 dark:text-forest-300 mb-1">Select Crop</label>
                      <select
                        value={newAlertCrop}
                        onChange={(e) => setNewAlertCrop(e.target.value)}
                        className="w-full bg-white dark:bg-forest-850 border border-earth-200 dark:border-forest-750 rounded-xl py-2 px-3 focus:outline-none dark:text-forest-100 font-semibold"
                      >
                        <option value="Tomato">Tomato</option>
                        <option value="Wheat">Wheat</option>
                        <option value="Rice">Rice</option>
                        <option value="Maize">Maize</option>
                        <option value="Cotton">Cotton</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-earth-700 dark:text-forest-300 mb-1">Condition</label>
                      <select
                        value={newAlertCondition}
                        onChange={(e) => setNewAlertCondition(e.target.value)}
                        className="w-full bg-white dark:bg-forest-850 border border-earth-200 dark:border-forest-750 rounded-xl py-2 px-3 focus:outline-none dark:text-forest-100 font-semibold"
                      >
                        <option value="above">Goes Above (से अधिक)</option>
                        <option value="below">Goes Below (से कम)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-earth-700 dark:text-forest-300 mb-1">Target Price (₹/kg)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newAlertPrice}
                        onChange={(e) => setNewAlertPrice(e.target.value)}
                        placeholder="e.g. 25"
                        className="w-full bg-white dark:bg-forest-850 border border-earth-200 dark:border-forest-750 rounded-xl py-2 px-3 focus:outline-none dark:text-forest-100 font-semibold"
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn-primary py-2.5 rounded-xl font-bold transition active:scale-95 w-full"
                    >
                      Set Alert
                    </button>
                  </form>

                  {/* List of active alerts */}
                  {priceAlerts.length > 0 ? (
                    <div className="space-y-2">
                      <strong className="font-bold text-earth-500 uppercase tracking-wider block">Active Price Watchers</strong>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {priceAlerts.map((alert) => (
                          <div key={alert.id} className="p-3 bg-white dark:bg-forest-900 border border-earth-150 dark:border-forest-850 rounded-xl flex justify-between items-center shadow-sm">
                            <div>
                              <strong className="text-earth-900 dark:text-forest-100">{alert.crop}</strong>
                              <span className="text-[10px] text-earth-455 block capitalize mt-0.5">
                                Alert if price goes {alert.alert_type} ₹{alert.target_price}/kg
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeletePriceAlert(alert.id)}
                              className="text-terracotta-600 hover:text-terracotta-800 font-bold px-2 py-1 hover:bg-terracotta-55 dark:hover:bg-terracotta-900/10 rounded transition"
                              title="Delete Alert"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-earth-500 italic text-center py-2">No active price alerts set. Use the form above to monitor market rate changes.</p>
                  )}
                </div>
              </div>

              {/* Alt-Data Credit Score Panel */}
              {creditData && (
                <div className="card-earth">
                  <h3 className="text-base font-black text-earth-900 dark:text-forest-100 flex items-center space-x-2 mb-4">
                    <Award className="w-5 h-5 text-forest-500" />
                    <span>{t('creditPanel')}</span>
                  </h3>

                  <div className="space-y-6">
                    {/* Score gauge visualizer */}
                    <div className="flex flex-col items-center justify-center p-4 bg-earth-50 dark:bg-forest-900/40 rounded-2xl border border-earth-150 dark:border-forest-800">
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        {/* Circular ring path mockup */}
                        <div className="absolute inset-0 rounded-full border-4 border-earth-200 dark:border-forest-850"></div>
                        <div className={`absolute inset-0 rounded-full border-4 transition-all duration-500 ${
                          creditData.score >= 75 ? 'border-forest-500' : creditData.score >= 50 ? 'border-amber-500' : 'border-terracotta-500'
                        }`} style={{ clipPath: `polygon(50% 50%, -50% -50%, ${creditData.score}% -50%)` }}></div>
                        
                        <div className="text-center z-10">
                          <span className="text-2xl font-black text-earth-900 dark:text-forest-100">{creditData.score}</span>
                          <span className="text-[9px] font-bold text-earth-400 block uppercase">FarmScore</span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold mt-3 px-3 py-1 rounded-full uppercase ${
                        creditData.score >= 75 ? 'bg-forest-100 text-forest-800' : creditData.score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-terracotta-100 text-terracotta-800'
                      }`}>
                        {creditData.score >= 75 ? 'Excellent Credit' : creditData.score >= 50 ? 'Moderate Credit' : 'Subprime Credit'}
                      </span>
                    </div>

                    {/* Active Streak */}
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xl">🔥</span>
                        <div>
                          <strong className="font-bold text-earth-850 dark:text-forest-100 block">
                            {creditData.streak_days > 0 ? `${creditData.streak_days}-Day Activity Streak!` : '0-Day Streak'}
                          </strong>
                          <span className="text-[10px] text-earth-500">Log soil telemetry daily to maintain your streak</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full capitalize">
                        {creditData.streak_days > 0 ? 'Active' : 'Idle'}
                      </span>
                    </div>

                    {/* Badge rewards chest */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-earth-500">🏆 Earned Badges & Achievements</h4>
                      {creditData.badges && creditData.badges.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-fade-in">
                          {creditData.badges.map((badge: any) => (
                            <div key={badge.id} className="p-3 bg-white dark:bg-forest-900 border border-earth-150 dark:border-forest-850 rounded-xl flex items-start space-x-3 shadow-sm transition hover:scale-[1.02]">
                              <span className="text-2xl">{badge.icon}</span>
                              <div className="leading-tight">
                                <strong className="font-bold text-earth-900 dark:text-forest-100 block">{badge.name}</strong>
                                <span className="text-[10px] text-earth-500 block mt-0.5">{badge.desc}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-earth-500 italic text-center py-2">No badges unlocked yet. Register fields and scans to earn rewards!</p>
                      )}
                    </div>

                    {/* Factors list */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500">{t('scoreBreakdown')}</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-3 bg-white dark:bg-forest-900 rounded-xl border border-earth-150 dark:border-forest-800 flex justify-between items-center">
                          <span className="text-earth-500 dark:text-forest-400">{t('scoreF_completeness')}</span>
                          <strong className="font-bold text-earth-800 dark:text-forest-100">{creditData.factors.completeness}/20</strong>
                        </div>
                        <div className="p-3 bg-white dark:bg-forest-900 rounded-xl border border-earth-150 dark:border-forest-800 flex justify-between items-center">
                          <span className="text-earth-500 dark:text-forest-400">{t('scoreF_diagnosis')}</span>
                          <strong className="font-bold text-earth-800 dark:text-forest-100">{creditData.factors.diagnosis}/25</strong>
                        </div>
                        <div className="p-3 bg-white dark:bg-forest-900 rounded-xl border border-earth-150 dark:border-forest-800 flex justify-between items-center">
                          <span className="text-earth-500 dark:text-forest-400">{t('scoreF_marketplace')}</span>
                          <strong className="font-bold text-earth-800 dark:text-forest-100">{creditData.factors.marketplace}/25</strong>
                        </div>
                        <div className="p-3 bg-white dark:bg-forest-900 rounded-xl border border-earth-150 dark:border-forest-800 flex justify-between items-center">
                          <span className="text-earth-500 dark:text-forest-400">{t('scoreF_repayment')}</span>
                          <strong className="font-bold text-earth-800 dark:text-forest-100">{creditData.factors.repayment}/30</strong>
                        </div>
                      </div>
                    </div>

                    {/* Improvement Tips */}
                    <div className="space-y-2 text-xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500">{t('scoreTips')}</h4>
                      <ul className="space-y-2">
                        {creditData.tips.map((tip: string, idx: number) => (
                          <li key={idx} className="flex items-start space-x-2 bg-earth-50 dark:bg-forest-900/30 p-2.5 rounded-lg border border-earth-100 dark:border-forest-850">
                            <Info className="w-4 h-4 text-forest-500 mt-0.5 flex-shrink-0" />
                            <span className="text-earth-650 dark:text-forest-300 leading-normal">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Micro-loan offers */}
                    <div className="space-y-3 pt-4 border-t border-earth-100 dark:border-forest-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500">{t('loanOffers')}</h4>
                      <div className="space-y-2">
                        {creditData.loan_offers.map((offer: any, idx: number) => (
                          <div key={idx} className="p-4 bg-forest-50 dark:bg-forest-800 border border-forest-200 dark:border-forest-700 rounded-xl space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[9px] font-bold text-forest-600 bg-forest-100 dark:bg-forest-750 dark:text-forest-300 px-2 py-0.5 rounded uppercase">{offer.status}</span>
                                <h4 className="text-sm font-black text-earth-900 dark:text-forest-100 mt-1">{offer.name}</h4>
                              </div>
                              <span className="text-sm font-black text-forest-700 dark:text-forest-300">₹{offer.amount}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-forest-200/50 dark:border-forest-700/50">
                              <div>
                                <span className="text-[10px] text-earth-450 block">{t('interest')}</span>
                                <span className="font-bold text-earth-800 dark:text-forest-200">{offer.interest_rate}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-earth-450 block">{t('duration')}</span>
                                <span className="font-bold text-earth-800 dark:text-forest-200">{offer.duration}</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-earth-500 leading-normal italic">{offer.purpose}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* ============================== BUYER ROLE ============================== */}
          {/* ========================================================================= */}
          {role === 'buyer' && (
            <div className="space-y-6">
              
              {/* Marketplace Browser */}
              <div className="card-earth">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-black text-earth-900 dark:text-forest-100 flex items-center space-x-2">
                    <Coins className="w-5 h-5 text-forest-500" />
                    <span>{t('marketplace')}</span>
                  </h3>
                  <button onClick={fetchBuyerListings} className="text-xs font-bold text-forest-600 hover:text-forest-700">Refresh</button>
                </div>

                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-earth-400" />
                      <input
                        type="text"
                        value={searchCrop}
                        onChange={(e) => setSearchCrop(e.target.value)}
                        placeholder="Search crops (e.g. Wheat)..."
                        className="input-earth pl-10 text-xs py-2.5"
                      />
                    </div>
                    <select
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value)}
                      className="input-earth text-xs py-2.5 max-w-[100px]"
                    >
                      <option value="">All Grades</option>
                      <option value="A">Grade A</option>
                      <option value="B">Grade B</option>
                      <option value="C">Grade C</option>
                    </select>
                  </div>

                  {/* Mandi Price Index Alert */}
                  <div className="p-3 bg-earth-100 dark:bg-forest-900 rounded-xl border border-earth-200 dark:border-forest-800 text-[11px] leading-relaxed flex items-start space-x-2">
                    <TrendingUp className="w-5 h-5 text-forest-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="font-bold text-earth-800 dark:text-forest-100">National Mandi Index Helper</strong>
                      <p className="text-earth-500 dark:text-forest-400 mt-0.5">Grade A Crop pricing currently averages: Wheat ₹25/kg, Rice ₹32/kg, Cotton ₹80/kg. Verify grades during pickup.</p>
                    </div>
                  </div>

                  {/* Listings Map-like list */}
                  <div className="space-y-3">
                    {(() => {
                      const filtered = allListings
                        .filter(l => !searchCrop || l.crop.toLowerCase().includes(searchCrop.toLowerCase()))
                        .filter(l => !filterGrade || l.quality_grade === filterGrade);
                      const totalPages = Math.ceil(filtered.length / marketPageSize);
                      const paginated = filtered.slice((marketPage - 1) * marketPageSize, marketPage * marketPageSize);

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-8 bg-earth-50/50 dark:bg-forest-900/10 rounded-2xl border border-dashed border-earth-200 dark:border-forest-800 p-6 flex flex-col items-center space-y-3">
                            <Coins className="w-10 h-10 text-forest-400 animate-pulse" />
                            <p className="text-xs font-bold text-earth-800 dark:text-forest-200">{t('noListings')}</p>
                            <p className="text-[11px] text-earth-450 dark:text-forest-400 max-w-xs leading-normal">
                              There are currently no active crop sales in the marketplace directory. Please check back later.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {paginated.map((listing) => (
                            <div key={listing.id} className="p-4 bg-white dark:bg-forest-900 border border-earth-150 dark:border-forest-800 rounded-2xl shadow-sm space-y-3 transition duration-150 hover:scale-[1.01]">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] text-earth-400 uppercase font-bold">Farmer: {listing.seller_name}</span>
                                  <h4 className="text-sm font-black text-earth-900 dark:text-forest-100 mt-0.5">
                                    {listing.quantity_kg}kg {listing.crop} (Grade {listing.quality_grade})
                                  </h4>
                                  <span className="text-[10px] text-earth-450 mt-1 flex items-center">
                                    <MapPin className="w-3.5 h-3.5 mr-1" />
                                    {listing.location} (Phone: {listing.seller_phone})
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-black text-forest-700 dark:text-forest-300">₹{listing.price_per_kg}/kg</span>
                                  <span className="text-[9px] text-earth-400 block mt-0.5">Asking Price</span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleOpenBidModal(listing)}
                                className="btn-primary w-full text-xs py-2 px-3 rounded-lg active:scale-95 transition"
                              >
                                {t('makeOffer')}
                              </button>
                            </div>
                          ))}

                          {/* Pagination controls */}
                          {totalPages > 1 && (
                            <div className="flex justify-between items-center pt-2 text-xs">
                              <button
                                disabled={marketPage === 1}
                                onClick={() => setMarketPage(p => Math.max(p - 1, 1))}
                                className="px-3 py-1.5 bg-earth-100 hover:bg-earth-200 dark:bg-forest-800 dark:hover:bg-forest-700 disabled:opacity-50 font-bold rounded-lg transition active:scale-95"
                              >
                                Previous
                              </button>
                              <span className="text-earth-500 dark:text-forest-300 font-bold">
                                Page {marketPage} of {totalPages}
                              </span>
                              <button
                                disabled={marketPage === totalPages}
                                onClick={() => setMarketPage(p => Math.min(p + 1, totalPages))}
                                className="px-3 py-1.5 bg-earth-100 hover:bg-earth-200 dark:bg-forest-800 dark:hover:bg-forest-700 disabled:opacity-50 font-bold rounded-lg transition active:scale-95"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </div>

              {/* Bids placed history */}
              <div className="card-earth">
                <h3 className="text-base font-black text-earth-900 dark:text-forest-100 flex items-center space-x-2 mb-4">
                  <Coins className="w-5 h-5 text-forest-500" />
                  <span>Placed Bids Status</span>
                </h3>

                {buyerOffers.length > 0 ? (
                  <div className="space-y-3">
                    {buyerOffers.map((o, idx) => (
                      <div key={idx} className="p-3 bg-earth-50 dark:bg-forest-900 rounded-xl border border-earth-150 dark:border-forest-800 flex justify-between items-center text-xs">
                        <div>
                          <strong className="font-bold text-earth-850 dark:text-forest-100">{o.quantity_kg}kg {o.crop} (Grade {o.quality_grade})</strong>
                          <span className="text-[10px] text-earth-450 block mt-0.5">Offered ₹{o.offered_price_per_kg}/kg (Asking: ₹{o.asking_price})</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          o.status === 'accepted' 
                            ? 'bg-forest-100 text-forest-800' 
                            : o.status === 'rejected' 
                              ? 'bg-terracotta-100 text-terracotta-800' 
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {o.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-earth-500 italic text-center py-2">No bids placed yet.</p>
                )}
              </div>

              {/* Bid Modal Overlay */}
              {showBidModal && selectedListingForBid && (
                <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-forest-800 max-w-sm w-full border border-earth-200 dark:border-forest-700 rounded-3xl p-6 shadow-2xl space-y-4">
                    <h3 className="text-base font-black text-earth-900 dark:text-forest-100">{t('makeOffer')}</h3>
                    <p className="text-xs text-earth-500 leading-normal">
                      Place your purchase bid for <strong className="text-forest-600">{selectedListingForBid.crop}</strong> offered by {selectedListingForBid.seller_name}.
                    </p>

                    <form onSubmit={handleSubmitBid} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-earth-400 block mb-1">{t('offeredPrice')} *</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={bidPrice}
                          onChange={(e) => setBidPrice(e.target.value)}
                          className="input-earth text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-earth-400 block mb-1">{t('quantityOffered')} *</label>
                        <input
                          type="number"
                          required
                          value={bidQty}
                          onChange={(e) => setBidQty(e.target.value)}
                          className="input-earth text-sm"
                        />
                      </div>

                      <div className="flex space-x-2 pt-2">
                        <button type="submit" className="btn-primary text-xs flex-1 py-2 px-3 rounded-lg">Submit Bid</button>
                        <button type="button" onClick={() => setShowBidModal(false)} className="btn-secondary text-xs flex-1 py-2 px-3 rounded-lg">Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* ======================== FINANCE OFFICER ROLE ========================== */}
          {/* ========================================================================= */}
          {role === 'finance_officer' && (
            <div className="space-y-6">

              {/* MFO Navigation Tabs */}
              <div className="flex space-x-1 bg-earth-100 dark:bg-forest-750 p-1 rounded-xl mb-4 border border-earth-200 dark:border-forest-700">
                <button
                  type="button"
                  onClick={() => setMfoView('registry')}
                  className={`flex-1 text-xs py-2 px-3 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 ${
                    mfoView === 'registry'
                      ? 'bg-white text-forest-700 dark:bg-forest-800 dark:text-forest-100 shadow-sm'
                      : 'text-earth-500 hover:text-earth-800 dark:hover:text-forest-200'
                  }`}
                >
                  <span>📋 Farmer Registry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMfoView('analytics')}
                  className={`flex-1 text-xs py-2 px-3 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 ${
                    mfoView === 'analytics'
                      ? 'bg-white text-forest-700 dark:bg-forest-800 dark:text-forest-100 shadow-sm'
                      : 'text-earth-500 hover:text-earth-800 dark:hover:text-forest-200'
                  }`}
                >
                  <span>📊 Portfolio Analytics</span>
                </button>
              </div>

              {mfoView === 'registry' && (
                <>
                  {/* Farmer underwriting registry */}
                  <div className="card-earth">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-black text-earth-900 dark:text-forest-100 flex items-center space-x-2">
                    <Search className="w-5 h-5 text-forest-500" />
                    <span>{t('farmerSearch')}</span>
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Search box */}
                  <input
                    type="text"
                    value={mfoSearch}
                    onChange={(e) => setMfoSearch(e.target.value)}
                    placeholder="Search by farmer name or phone..."
                    className="input-earth text-xs py-2.5"
                  />

                  {/* Farmers list cards */}
                  <div className="space-y-3">
                    {filteredFarmers.length > 0 ? (
                      filteredFarmers.map((farmer) => (
                        <div key={farmer.id} className="p-4 bg-earth-50 dark:bg-forest-900/40 rounded-xl border border-earth-150 dark:border-forest-800 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-earth-900 dark:text-forest-100">{farmer.name}</h4>
                              <span className="text-[10px] text-earth-450 block">{farmer.phone} | {farmer.email || 'No email'}</span>
                            </div>
                            
                            {/* FarmScore visualizer badge */}
                            <div className="text-right">
                              <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${
                                farmer.score >= 75 ? 'bg-forest-100 text-forest-800' : farmer.score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-terracotta-100 text-terracotta-800'
                              }`}>
                                {farmer.score}
                              </span>
                              <span className="text-[9px] text-earth-400 block mt-1 uppercase">FarmScore</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[10px] text-earth-500 dark:text-forest-400 pt-2 border-t border-earth-100 dark:border-forest-800">
                            <div>
                              <span className="block font-medium">Fields:</span>
                              <span className="font-bold text-earth-800 dark:text-forest-200">{farmer.fields_count} ({farmer.land_acres} ac)</span>
                            </div>
                            <div>
                              <span className="block font-medium">Completed Sales:</span>
                              <span className="font-bold text-earth-800 dark:text-forest-200">₹{farmer.completed_sales_value}</span>
                            </div>
                            <div>
                              <span className="block font-medium">Risk Status:</span>
                              <span className={`font-bold uppercase ${
                                farmer.risk_rating === 'Low' ? 'text-forest-600' : farmer.risk_rating === 'Medium' ? 'text-amber-600' : 'text-terracotta-500'
                              }`}>{farmer.risk_rating}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedFarmerReport(farmer)}
                            className="btn-secondary w-full text-[11px] py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{t('viewReport')}</span>
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-earth-500 italic text-center py-4">No matching farmers found.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Individual Farmer Underwriting Credit Report Modal */}
              {selectedFarmerReport && (
                <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 overflow-y-auto">
                  <div className="printable-report bg-white dark:bg-forest-800 max-w-md w-full border border-earth-200 dark:border-forest-700 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
                    <div className="flex justify-between items-start border-b border-earth-150 dark:border-forest-700 pb-3">
                      <div>
                        <span className="text-[10px] text-earth-450 uppercase font-bold">Alt-Data Financial Underwriting</span>
                        <h3 className="text-base font-black text-earth-900 dark:text-forest-100">{selectedFarmerReport.name}</h3>
                      </div>
                      <button onClick={() => setSelectedFarmerReport(null)} className="text-earth-500 hover:text-earth-700 font-bold text-lg no-print">×</button>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Big Score Gauge */}
                      <div className="flex items-center justify-between p-4 bg-earth-50 dark:bg-forest-900/40 rounded-2xl border border-earth-150 dark:border-forest-800">
                        <div>
                          <span className="text-2xl font-black text-earth-950 dark:text-forest-100">{selectedFarmerReport.score}</span>
                          <span className="text-[10px] font-bold text-earth-400 block uppercase">FarmScore rating</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold px-2.5 py-0.5 rounded text-[10px] uppercase ${
                            selectedFarmerReport.risk_rating === 'Low' ? 'bg-forest-100 text-forest-800' : selectedFarmerReport.risk_rating === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-terracotta-100 text-terracotta-800'
                          }`}>
                            {selectedFarmerReport.risk_rating} Risk Profile
                          </span>
                        </div>
                      </div>

                      {/* Underwriting Factors list */}
                      <div className="space-y-2">
                        <strong className="font-bold text-earth-500 uppercase tracking-wider block">Credit Underwriting Checklist</strong>
                        <div className="space-y-1.5">
                          <div className="flex justify-between p-2 bg-white dark:bg-forest-900 rounded-lg border border-earth-100 dark:border-forest-800">
                            <span>Field Data Completeness:</span>
                            <span className="font-bold">{selectedFarmerReport.fields_count} active fields registered</span>
                          </div>
                          <div className="flex justify-between p-2 bg-white dark:bg-forest-900 rounded-lg border border-earth-100 dark:border-forest-800">
                            <span>Completed Trade History:</span>
                            <span className="font-bold">{selectedFarmerReport.transactions_count} completed sales</span>
                          </div>
                          <div className="flex justify-between p-2 bg-white dark:bg-forest-900 rounded-lg border border-earth-100 dark:border-forest-800">
                            <span>Agronomical Health checks:</span>
                            <span className="font-bold">IoT telemetry logs active</span>
                          </div>
                        </div>
                      </div>

                      {/* Score improvement advice */}
                      {selectedFarmerReport.tips && selectedFarmerReport.tips.length > 0 && (
                        <div className="space-y-2">
                          <strong className="font-bold text-earth-500 uppercase tracking-wider block">Agronomical Weaknesses / Risk Mitigation</strong>
                          <ul className="space-y-1.5">
                            {selectedFarmerReport.tips.map((tip: string, idx: number) => (
                              <li key={idx} className="flex items-start space-x-2 text-earth-500 bg-earth-50 dark:bg-forest-900/30 p-2 rounded border border-earth-100 dark:border-forest-850">
                                <Info className="w-4 h-4 text-forest-500 flex-shrink-0" />
                                <span className="leading-normal">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Underwriting actions */}
                      <div className="flex space-x-2 pt-2 no-print">
                        <button
                          type="button"
                          onClick={() => {
                            window.print();
                          }}
                          className="btn-secondary flex-1 text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 active:scale-95 transition"
                        >
                          <span>🖨️ Export PDF Report</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSuccess(`Approved micro-loan underwriting files for ${selectedFarmerReport.name}!`);
                            setSelectedFarmerReport(null);
                          }}
                          className="btn-primary flex-1 text-xs py-2 px-3 rounded-lg active:scale-95 transition"
                        >
                          Approve Loan Limit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
                </>
              )}

              {/* MFO Portfolio Analytics Hub */}
              {mfoView === 'analytics' && creditAnalytics && (
                <div className="space-y-6 animate-fade-in text-xs">
                  
                  {/* Regional FarmScore Averages */}
                  <div className="card-earth">
                    <h4 className="text-sm font-black text-earth-900 dark:text-forest-100 mb-4 flex items-center space-x-2">
                      <span>🌍 Regional Average FarmScores</span>
                    </h4>
                    <div className="h-56 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={creditAnalytics.regional_averages} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="region" tick={{ fontSize: 9 }} stroke="currentColor" />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="currentColor" />
                          <ChartTooltip contentStyle={{ fontSize: 10, background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                          <Bar dataKey="average_score" fill="#166534" radius={[6, 6, 0, 0]}>
                            {creditAnalytics.regional_averages.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#15803d' : '#22c55e'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Disease Case Distribution */}
                    <div className="card-earth">
                      <h4 className="text-sm font-black text-earth-900 dark:text-forest-100 mb-4 flex items-center space-x-2">
                        <span>🦠 Crop Disease Prevalence</span>
                      </h4>
                      <div className="h-56 w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={creditAnalytics.common_diseases} layout="vertical" margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis type="number" tick={{ fontSize: 9 }} stroke="currentColor" />
                            <YAxis dataKey="disease" type="category" width={80} tick={{ fontSize: 8 }} stroke="currentColor" />
                            <ChartTooltip contentStyle={{ fontSize: 10, background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey="cases" fill="#b91c1c" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Marketplace volume */}
                    <div className="card-earth">
                      <h4 className="text-sm font-black text-earth-900 dark:text-forest-100 mb-4 flex items-center space-x-2">
                        <span>💰 Marketplace Trade Volume (INR)</span>
                      </h4>
                      <div className="h-56 w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={creditAnalytics.transaction_by_crop} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="crop" tick={{ fontSize: 9 }} stroke="currentColor" />
                            <YAxis tick={{ fontSize: 9 }} stroke="currentColor" />
                            <ChartTooltip contentStyle={{ fontSize: 10, background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey="volume_inr" fill="#0369a1" radius={[6, 6, 0, 0]}>
                              {creditAnalytics.transaction_by_crop.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0284c7' : '#0ea5e9'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}
        </>
      )}

      {!loading && activeTab === 'forum' && (
        <div className="space-y-6 animate-fade-in">
          {/* Question submission form */}
          <div className="card-earth">
            <h3 className="text-base font-black text-earth-900 dark:text-forest-100 flex items-center space-x-2 mb-4">
              <span>❓ Ask the Community</span>
            </h3>

            <form onSubmit={handleCreateQuestion} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-earth-700 dark:text-forest-300 mb-1">Crop Type</label>
                  <select
                    value={newQuestionCrop}
                    onChange={(e) => setNewQuestionCrop(e.target.value)}
                    className="w-full bg-earth-50 dark:bg-forest-900 border border-earth-200 dark:border-forest-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-forest-500 dark:text-forest-100 font-semibold"
                  >
                    <option value="Tomato">Tomato</option>
                    <option value="Wheat">Wheat</option>
                    <option value="Rice">Rice</option>
                    <option value="Maize">Maize</option>
                    <option value="Cotton">Cotton</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-earth-700 dark:text-forest-300 mb-1">Your Region</label>
                  <input
                    type="text"
                    required
                    value={newQuestionRegion}
                    onChange={(e) => setNewQuestionRegion(e.target.value)}
                    placeholder="e.g. Rajasthan"
                    className="w-full bg-earth-50 dark:bg-forest-900 border border-earth-200 dark:border-forest-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-forest-500 dark:text-forest-100 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-earth-700 dark:text-forest-300 mb-1">Your Question / आपका प्रश्न</label>
                <textarea
                  required
                  rows={3}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Describe your query in detail..."
                  className="w-full bg-earth-50 dark:bg-forest-900 border border-earth-200 dark:border-forest-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-forest-500 dark:text-forest-100 font-medium"
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-2.5 rounded-xl font-bold transition active:scale-95"
              >
                Post Question
              </button>
            </form>
          </div>

          {/* Forum Q&A Feed */}
          <div className="card-earth">
            <h3 className="text-base font-black text-earth-900 dark:text-forest-100 flex items-center justify-between mb-4">
              <span>💬 Community Discussions</span>
              {forumQuestions.length > 0 && (
                <span className="text-[10px] bg-forest-100 dark:bg-forest-900 text-forest-750 dark:text-forest-300 font-black px-2 py-0.5 rounded-full">
                  {forumQuestions.length} Threads
                </span>
              )}
            </h3>

            {/* Filter bar */}
            <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-earth-50 dark:bg-forest-900/50 rounded-xl border border-earth-150 dark:border-forest-800 text-xs">
              <div>
                <label className="block font-bold text-earth-750 dark:text-forest-300 mb-1">Filter Crop</label>
                <input
                  type="text"
                  value={forumCropFilter}
                  onChange={(e) => setForumCropFilter(e.target.value)}
                  placeholder="e.g. Tomato"
                  className="w-full bg-white dark:bg-forest-850 border border-earth-200 dark:border-forest-750 rounded-lg py-1.5 px-2.5 focus:outline-none dark:text-forest-100 font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-earth-750 dark:text-forest-300 mb-1">Filter Region</label>
                <input
                  type="text"
                  value={forumRegionFilter}
                  onChange={(e) => setForumRegionFilter(e.target.value)}
                  placeholder="e.g. Rajasthan"
                  className="w-full bg-white dark:bg-forest-850 border border-earth-200 dark:border-forest-750 rounded-lg py-1.5 px-2.5 focus:outline-none dark:text-forest-100 font-medium"
                />
              </div>
            </div>

            {forumLoading ? (
              <ListSkeleton />
            ) : forumQuestions.length > 0 ? (
              <div className="space-y-4">
                {forumQuestions.map((q) => (
                  <div key={q.id} className="p-4 bg-earth-50/50 dark:bg-forest-900/30 border border-earth-150 dark:border-forest-850 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start text-[10px] text-earth-450 dark:text-forest-400">
                      <div>
                        <strong className="font-bold text-earth-850 dark:text-forest-100">{q.user_name}</strong>
                        <span className="ml-1 capitalize">({q.user_role})</span>
                      </div>
                      <span className="font-mono text-[9px]">{new Date(q.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex space-x-1.5 items-center">
                        <span className="bg-forest-100 dark:bg-forest-900 text-forest-750 dark:text-forest-300 font-bold text-[9px] px-1.5 py-0.5 rounded capitalize">
                          {q.crop_type}
                        </span>
                        <span className="bg-earth-200 dark:bg-forest-800 text-earth-650 dark:text-forest-200 font-bold text-[9px] px-1.5 py-0.5 rounded">
                          📍 {q.region}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-earth-900 dark:text-forest-100 leading-normal">
                        {q.question_text}
                      </p>
                    </div>

                    {/* Answers block */}
                    <div className="space-y-2.5 border-t border-earth-200/50 dark:border-forest-800 pt-3">
                      {q.answers.length > 0 && (
                        <div className="space-y-2">
                          {q.answers.map((a: any) => (
                            <div key={a.id} className="p-2.5 bg-white dark:bg-forest-900 border border-earth-100 dark:border-forest-850 rounded-xl space-y-1 text-xs">
                              <div className="flex justify-between items-center text-[9px] text-earth-450">
                                <div>
                                  <strong className={`font-bold ${a.is_extension_officer ? 'text-forest-600 dark:text-forest-300' : 'text-earth-750 dark:text-forest-200'}`}>
                                    {a.user_name}
                                  </strong>
                                  <span className="ml-1 capitalize">({a.user_role})</span>
                                  {a.is_extension_officer === 1 && (
                                    <span className="ml-1.5 bg-forest-600 text-white text-[8px] font-black px-1 py-0.25 rounded-md">
                                      OFFICER
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[8px]">{new Date(a.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-earth-800 dark:text-forest-100 leading-normal">{a.answer_text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add answer input */}
                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          type="text"
                          value={newAnswerTexts[q.id] || ''}
                          onChange={(e) => setNewAnswerTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Write a response... / जवाब लिखें..."
                          className="flex-1 bg-white dark:bg-forest-900 border border-earth-200 dark:border-forest-750 rounded-xl py-1.5 px-3 focus:outline-none text-xs dark:text-forest-100 font-medium shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => handleSubmitAnswer(q.id)}
                          className="btn-primary text-xs py-1.5 px-3.5 rounded-xl font-bold transition active:scale-95"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-earth-500 italic text-center py-6">No matching questions found.</p>
            )}
          </div>
        </div>
      )}

      {/* Onboarding Tour Overlay Modal */}
      {tourStep !== null && TOUR_STEPS[role] && TOUR_STEPS[role][tourStep] && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-forest-800 border border-earth-200 dark:border-forest-750 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 text-center transform transition-all duration-300 scale-100">
            {/* Step Counter */}
            <div className="flex justify-center items-center space-x-1.5">
              {[0, 1, 2].map((idx) => (
                <span
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    idx === tourStep ? 'bg-forest-500 w-5' : 'bg-earth-200 dark:bg-forest-700'
                  }`}
                />
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black text-earth-900 dark:text-forest-100">
                {i18n.language === 'hi' ? TOUR_STEPS[role][tourStep].title_hi : TOUR_STEPS[role][tourStep].title}
              </h3>
              <p className="text-xs text-earth-500 dark:text-forest-400 leading-relaxed font-medium">
                {i18n.language === 'hi' ? TOUR_STEPS[role][tourStep].desc_hi : TOUR_STEPS[role][tourStep].desc}
              </p>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={handleCompleteTour}
                className="btn-secondary text-xs flex-1 py-2 px-3 rounded-lg"
              >
                Skip / छोड़ें
              </button>
              {tourStep < 2 ? (
                <button
                  type="button"
                  onClick={() => setTourStep(tourStep + 1)}
                  className="btn-primary text-xs flex-1 py-2 px-3 rounded-lg"
                >
                  Next / आगे
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteTour}
                  className="btn-primary text-xs flex-1 py-2 px-3 rounded-lg"
                >
                  Got It! / समझ गए
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
