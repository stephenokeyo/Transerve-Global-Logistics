import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Address, PackageDetails, RateOption, Shipment, PackageType, Carrier } from '../types/shipping';
import { calculateLiveCarrierRates, buildProgrammaticShipment } from '../services/carrierIntegration';
import { addShipment } from '../data/mockShipments';
import { ShippingLabel } from './ShippingLabel';
import { useI18n } from '../i18n/I18nContext';
import { 
  Package, Truck, ArrowRight, ShieldCheck, Check, Sparkles, 
  Printer, Radio, FileText, Snowflake, Info, Zap, Calculator,
  X, Copy, MapPin, Building, Calendar, DollarSign, CheckCircle2, ShieldAlert
} from 'lucide-react';

interface ShippingLabelGeneratorProps {
  onShipmentCreated: (shipment: Shipment) => void;
}

export const ShippingLabelGenerator: React.FC<ShippingLabelGeneratorProps> = ({ onShipmentCreated }) => {
  const { t, formatCurrency, formatWeight, formatDate } = useI18n();
  // Step tracker: 1 = Addresses & Package, 2 = Choose Rate, 3 = Generated Label
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);


  // Shipper (Origin)
  const [shipper, setShipper] = useState<Address>({
    name: 'Harrison Vance',
    company: 'Apex Precision Engineering',
    street1: '100 Congress Avenue',
    street2: 'Suite 1400',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    country: 'United States',
    phone: '+1 (512) 555-0188',
    email: 'logistics@apexengineering.com',
  });

  // Recipient (Destination)
  const [recipient, setRecipient] = useState<Address>({
    name: 'Dr. Sarah Lin',
    company: 'Kendall Square Nanotech Institute',
    street1: '400 Main Street',
    street2: 'Building 5, Lab 202',
    city: 'Boston',
    state: 'MA',
    zipCode: '02142',
    country: 'United States',
    phone: '+1 (617) 555-3921',
    email: 's.lin@kendallnano.org',
  });

  // Package specs
  const [packageDetails, setPackageDetails] = useState<PackageDetails>({
    weightKg: 4.8,
    lengthCm: 35,
    widthCm: 28,
    heightCm: 22,
    declaredValueUsd: 3500,
    packageType: 'box',
    contentsDescription: 'Microfluidic Diagnostic Sensors & Controllers',
    isFragile: true,
    isHazardous: false,
    requiresSignature: true,
    isColdChain: false,
    targetTempC: -20,
  });

  const [specialInstructions, setSpecialInstructions] = useState('Handle with extreme care. Keep dry.');
  const [selectedRate, setSelectedRate] = useState<RateOption | null>(null);
  const [generatedShipment, setGeneratedShipment] = useState<Shipment | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);

  const handleCopyTracking = (trackingNum: string) => {
    navigator.clipboard.writeText(trackingNum);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const handleConfirmPrint = () => {
    setShowPrintConfirmModal(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Calculate live dimensional weight
  const dimWeightKg = useMemo(() => {
    return Math.round(((packageDetails.lengthCm * packageDetails.widthCm * packageDetails.heightCm) / 5000) * 10) / 10;
  }, [packageDetails.lengthCm, packageDetails.widthCm, packageDetails.heightCm]);

  const billableWeightKg = Math.max(packageDetails.weightKg, dimWeightKg);

  // Fetch real-time shipping rates from carriers
  const liveRates = useMemo(() => {
    return calculateLiveCarrierRates({
      originZip: shipper.zipCode,
      originCountry: shipper.country,
      destZip: recipient.zipCode,
      destCountry: recipient.country,
      weightKg: packageDetails.weightKg,
      lengthCm: packageDetails.lengthCm,
      widthCm: packageDetails.widthCm,
      heightCm: packageDetails.heightCm,
      packageType: packageDetails.packageType,
      declaredValueUsd: packageDetails.declaredValueUsd,
      isFragile: packageDetails.isFragile,
      isColdChain: packageDetails.isColdChain,
      requiresSignature: packageDetails.requiresSignature,
    });
  }, [shipper.zipCode, shipper.country, recipient.zipCode, recipient.country, packageDetails]);

  // Pre-fill presets for user testing convenience
  const loadPreset = (presetKey: 'medical' | 'california_ground' | 'transatlantic') => {
    if (presetKey === 'medical') {
      setShipper({
        name: 'Novartis Biologics Hub',
        company: 'Cold Storage Vault 2',
        street1: '59 Cambridgepark Dr',
        city: 'Cambridge',
        state: 'MA',
        zipCode: '02140',
        country: 'United States',
        phone: '+1 (617) 555-8810',
        email: 'coldchain@novartis.com',
      });
      setRecipient({
        name: 'Scripps Research Institute',
        company: 'Genomics Department',
        street1: '10550 N Torrey Pines Rd',
        city: 'San Diego',
        state: 'CA',
        zipCode: '92037',
        country: 'United States',
        phone: '+1 (858) 555-2011',
        email: 'lab-dock@scripps.edu',
      });
      setPackageDetails({
        weightKg: 12.0,
        lengthCm: 50,
        widthCm: 40,
        heightCm: 35,
        declaredValueUsd: 45000,
        packageType: 'cold_insulated',
        contentsDescription: 'Cryogenic Peptide Sequences',
        isFragile: true,
        isHazardous: false,
        requiresSignature: true,
        isColdChain: true,
        targetTempC: -20,
      });
    } else if (presetKey === 'california_ground') {
      setShipper({
        name: 'Pacific Robotics Assembly',
        company: 'Bay 12',
        street1: '2100 4th Street',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98121',
        country: 'United States',
        phone: '+1 (206) 555-4012',
        email: 'dispatch@pacificrobotics.com',
      });
      setRecipient({
        name: 'Silicon Valley Innovation Hub',
        company: 'Hardware Verification',
        street1: '3200 Coronado Drive',
        city: 'Santa Clara',
        state: 'CA',
        zipCode: '95054',
        country: 'United States',
        phone: '+1 (408) 555-7199',
        email: 'hw-inbound@svinnovation.com',
      });
      setPackageDetails({
        weightKg: 8.5,
        lengthCm: 45,
        widthCm: 35,
        heightCm: 25,
        declaredValueUsd: 6200,
        packageType: 'box',
        contentsDescription: 'Autonomous Guidance Sensors',
        isFragile: true,
        isHazardous: false,
        requiresSignature: true,
        isColdChain: false,
      });
    }
  };

  const handleProceedToRates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRate && liveRates.length > 0) {
      setSelectedRate(liveRates[0]);
    }
    setCurrentStep(2);
  };

  const handleProgrammaticGenerate = () => {
    if (!selectedRate) return;
    setIsGenerating(true);

    setTimeout(() => {
      const newShipment = buildProgrammaticShipment({
        shipper,
        recipient,
        packageDetails,
        selectedRate,
        specialInstructions,
      });

      // Persist into database & storage
      addShipment(newShipment);
      setGeneratedShipment(newShipment);
      setIsGenerating(false);
      setCurrentStep(3);

      // Trigger celebration
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }, 800);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Step Indicator Header */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {t('generator.title')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('generator.subtitle')}
            </p>
          </div>

          {/* Stepper Tabs */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                currentStep === 1 ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 bg-white border border-slate-200'
              }`}
            >
              1. {t('generator.shipperSection')}
            </span>
            <span className="text-slate-300">→</span>
            <span
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                currentStep === 2 ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 bg-white border border-slate-200'
              }`}
            >
              2. {t('generator.carrierSelection')}
            </span>
            <span className="text-slate-300">→</span>
            <span
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                currentStep === 3 ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 bg-white border border-slate-200'
              }`}
            >
              3. {t('generator.createLabelBtn')}
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1: Addresses & Package Details */}
      {currentStep === 1 && (
        <form onSubmit={handleProceedToRates} className="p-6 space-y-8">
          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-blue-900 font-medium">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>{t('generator.quickPresets')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadPreset('medical')}
                className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 rounded font-medium transition-colors"
              >
                {t('generator.presetPharma')}
              </button>
              <button
                type="button"
                onClick={() => loadPreset('california_ground')}
                className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 rounded font-medium transition-colors"
              >
                {t('generator.presetHeavy')}
              </button>
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Shipper (Origin) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">A</span>
                  Shipper (Origin)
                </h3>
                <span className="text-xs text-slate-500 font-mono">FROM</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Company / Sender Name</label>
                  <input
                    type="text"
                    required
                    value={shipper.name}
                    onChange={(e) => setShipper({ ...shipper, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={shipper.street1}
                    onChange={(e) => setShipper({ ...shipper, street1: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block font-medium text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={shipper.city}
                      onChange={(e) => setShipper({ ...shipper, city: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={shipper.state}
                      onChange={(e) => setShipper({ ...shipper, state: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Zip Code</label>
                    <input
                      type="text"
                      required
                      value={shipper.zipCode}
                      onChange={(e) => setShipper({ ...shipper, zipCode: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={shipper.phone}
                      onChange={(e) => setShipper({ ...shipper, phone: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={shipper.email}
                      onChange={(e) => setShipper({ ...shipper, email: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient (Consignee) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">B</span>
                  Recipient (Consignee)
                </h3>
                <span className="text-xs text-slate-500 font-mono">SHIP TO</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Recipient Name / Contact</label>
                  <input
                    type="text"
                    required
                    value={recipient.name}
                    onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Company / Organization (Optional)</label>
                  <input
                    type="text"
                    value={recipient.company || ''}
                    onChange={(e) => setRecipient({ ...recipient, company: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={recipient.street1}
                    onChange={(e) => setRecipient({ ...recipient, street1: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block font-medium text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={recipient.city}
                      onChange={(e) => setRecipient({ ...recipient, city: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={recipient.state}
                      onChange={(e) => setRecipient({ ...recipient, state: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Zip Code</label>
                    <input
                      type="text"
                      required
                      value={recipient.zipCode}
                      onChange={(e) => setRecipient({ ...recipient, zipCode: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Package Dimensions & Handling */}
          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-700" />
              Package Specifications & Volumetric Weight
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Actual Wt (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={packageDetails.weightKg}
                  onChange={(e) => setPackageDetails({ ...packageDetails, weightKg: parseFloat(e.target.value) || 1 })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Length (cm)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={packageDetails.lengthCm}
                  onChange={(e) => setPackageDetails({ ...packageDetails, lengthCm: parseInt(e.target.value, 10) || 10 })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Width (cm)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={packageDetails.widthCm}
                  onChange={(e) => setPackageDetails({ ...packageDetails, widthCm: parseInt(e.target.value, 10) || 10 })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Height (cm)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={packageDetails.heightCm}
                  onChange={(e) => setPackageDetails({ ...packageDetails, heightCm: parseInt(e.target.value, 10) || 10 })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Declared Value ($)</label>
                <input
                  type="number"
                  min="0"
                  value={packageDetails.declaredValueUsd}
                  onChange={(e) => setPackageDetails({ ...packageDetails, declaredValueUsd: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Billable Weight Indicator */}
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span>
                  Volumetric (Dim) Weight: <strong className="font-mono text-slate-900">{dimWeightKg} kg</strong> (L×W×H / 5000)
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  Billable Carrier Weight: <strong className="font-mono text-slate-900">{billableWeightKg} kg</strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-500">IATA Standard Volumetric Formula</span>
            </div>

            {/* Special Handling Checkboxes */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={packageDetails.isFragile}
                  onChange={(e) => setPackageDetails({ ...packageDetails, isFragile: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Fragile / Cushioning</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={packageDetails.requiresSignature}
                  onChange={(e) => setPackageDetails({ ...packageDetails, requiresSignature: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">Direct Signature Required</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-cyan-50/50">
                <input
                  type="checkbox"
                  checked={packageDetails.isColdChain}
                  onChange={(e) => setPackageDetails({ ...packageDetails, isColdChain: e.target.checked })}
                  className="rounded text-cyan-600 focus:ring-cyan-500"
                />
                <span className="font-medium text-cyan-900 flex items-center gap-1">
                  <Snowflake className="w-3.5 h-3.5 text-cyan-700" /> Cold-Chain (-20°C)
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={packageDetails.isHazardous}
                  onChange={(e) => setPackageDetails({ ...packageDetails, isHazardous: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium text-slate-800">Lithium / Dangerous Goods</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
            >
              <span>Fetch Live Carrier Rates</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: Live Carrier Rates Selection */}
      {currentStep === 2 && (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t('generator.carrierSelection')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('generator.ratesSubtitle')}
              </p>
            </div>
            <button
              onClick={() => setCurrentStep(1)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              ← {t('common.edit')}
            </button>
          </div>

          {/* Rates List */}
          <div className="space-y-3">
            {liveRates.map((rate, idx) => {
              const isSelected = selectedRate?.serviceLevel === rate.serviceLevel && selectedRate?.carrier === rate.carrier;
              return (
                <div
                  key={`${rate.carrier}-${rate.serviceLevel}`}
                  onClick={() => setSelectedRate(rate)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="carrier_rate"
                      checked={isSelected}
                      onChange={() => setSelectedRate(rate)}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">{rate.carrierName}</span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {t('generator.cheapest')}
                          </span>
                        )}
                        {rate.transitDays === 1 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            {t('generator.fastest')}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                        <span className="font-medium text-slate-800">{rate.deliveryTimeWindow}</span>
                        <span aria-hidden="true">·</span>
                        <span>{rate.transitDays} {t('generator.estTransit')}</span>
                        <span aria-hidden="true">·</span>
                        <span>{t('tracker.estimatedDelivery')}: {rate.deliveryDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end">
                    <div className="text-xl font-black font-mono text-slate-900 tabular-nums">
                      {formatCurrency(rate.totalCost)}
                    </div>
                    <div className="text-[11px] text-slate-500 space-x-1 font-mono">
                      <span>Base: {formatCurrency(rate.baseCost)}</span>
                      <span>+ Fuel: {formatCurrency(rate.fuelSurcharge)}</span>
                      {rate.insuranceCost > 0 && <span>+ Ins: {formatCurrency(rate.insuranceCost)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {t('common.cancel')}
            </button>

            <button
              onClick={handleProgrammaticGenerate}
              disabled={isGenerating || !selectedRate}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('generator.creatingLabel')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{t('generator.createLabelBtn')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Generated Label and Telematics Activation */}
      {currentStep === 3 && generatedShipment && (
        <div className="p-6 space-y-8">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  {t('generator.successTitle')}
                </h3>
                <p className="text-xs text-emerald-800">
                  {t('manifest.colTracking')}: <strong className="font-mono">{generatedShipment.trackingNumber}</strong> · {t('generator.successSubtitle')}
                </p>
              </div>
            </div>

            <button
              onClick={() => onShipmentCreated(generatedShipment)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{t('nav.liveTracking')}</span>
            </button>
          </div>

          {/* Render Authentic 4x6 Printable Label */}
          <ShippingLabel 
            shipment={generatedShipment} 
            onPrint={() => setShowPrintConfirmModal(true)} 
          />

          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
            <button
              onClick={() => {
                setGeneratedShipment(null);
                setCurrentStep(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              + {t('generator.createAnother')}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintConfirmModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t('generator.printThermal')}</span>
              </button>

              <button
                type="button"
                onClick={() => onShipmentCreated(generatedShipment)}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <span>{t('generator.viewManifest')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Confirmation Dialog Modal */}
      {showPrintConfirmModal && generatedShipment && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="print-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrintConfirmModal(false);
          }}
        >
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shadow-xs">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="print-dialog-title" className="text-base font-bold text-slate-900">
                    {t('generator.printConfirmTitle')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('generator.printConfirmSubtitle')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold border border-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  4" × 6" Thermal
                </span>
                <button
                  type="button"
                  onClick={() => setShowPrintConfirmModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Carrier & Tracking Banner */}
              <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-white/10 text-white border border-white/20">
                    {generatedShipment.carrier === 'vanguard' && 'Transerve Express'}
                    {generatedShipment.carrier === 'fedex' && 'FedEx Express'}
                    {generatedShipment.carrier === 'dhl' && 'DHL Express'}
                    {generatedShipment.carrier === 'ups' && 'UPS Worldwide'}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-300">
                      {generatedShipment.serviceLevel}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{t('label.deliverBy')}: <strong>{formatDate(generatedShipment.estimatedDelivery)}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">{t('label.tracking')}</span>
                    <span className="font-mono text-sm font-bold text-amber-300 tracking-wide">{generatedShipment.trackingNumber}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyTracking(generatedShipment.trackingNumber)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    title={t('common.copy')}
                  >
                    {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Origin & Destination Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Shipper */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t('generator.shipperDetails')}</span>
                  </div>
                  <div className="text-slate-900 font-bold text-sm">
                    {generatedShipment.shipper.name}
                  </div>
                  {generatedShipment.shipper.company && (
                    <div className="text-xs font-medium text-slate-600 flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      <span>{generatedShipment.shipper.company}</span>
                    </div>
                  )}
                  <div className="text-xs text-slate-600 leading-snug">
                    {generatedShipment.shipper.street1}
                    {generatedShipment.shipper.street2 ? `, ${generatedShipment.shipper.street2}` : ''}<br />
                    {generatedShipment.shipper.city}, {generatedShipment.shipper.state} {generatedShipment.shipper.zipCode}, {generatedShipment.shipper.country}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono pt-1">
                    {generatedShipment.shipper.phone}
                  </div>
                </div>

                {/* Recipient */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('generator.recipientDetails')}</span>
                  </div>
                  <div className="text-slate-900 font-bold text-sm">
                    {generatedShipment.recipient.name}
                  </div>
                  {generatedShipment.recipient.company && (
                    <div className="text-xs font-medium text-slate-600 flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      <span>{generatedShipment.recipient.company}</span>
                    </div>
                  )}
                  <div className="text-xs text-slate-600 leading-snug">
                    {generatedShipment.recipient.street1}
                    {generatedShipment.recipient.street2 ? `, ${generatedShipment.recipient.street2}` : ''}<br />
                    {generatedShipment.recipient.city}, {generatedShipment.recipient.state} {generatedShipment.recipient.zipCode}, {generatedShipment.recipient.country}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono pt-1">
                    {generatedShipment.recipient.phone}
                  </div>
                </div>
              </div>

              {/* Package Specs */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {t('generator.packageSpecs')}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">{t('generator.dimSummary')}</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {generatedShipment.package.lengthCm} × {generatedShipment.package.widthCm} × {generatedShipment.package.heightCm} cm
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">{t('generator.weightSummary')}</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {formatWeight(billableWeightKg)}
                      <span className="text-[10px] font-normal text-slate-500 block">({formatWeight(generatedShipment.package.weightKg)} act.)</span>
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">{t('generator.packageFormat')}</span>
                    <span className="font-semibold text-slate-900 text-xs uppercase">
                      {generatedShipment.package.packageType}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">{t('generator.declaredValueSummary')}</span>
                    <span className="font-mono font-bold text-emerald-700 text-xs">
                      {formatCurrency(generatedShipment.package.declaredValueUsd)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Special Handling Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {generatedShipment.package.requiresSignature && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[11px] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    {t('generator.directSigBadge')}
                  </span>
                )}
                {generatedShipment.package.isFragile && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-md text-[11px] font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    {t('generator.fragileBadge')}
                  </span>
                )}
                {generatedShipment.package.isColdChain && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-md text-[11px] font-semibold">
                    <Snowflake className="w-3.5 h-3.5 text-cyan-600" />
                    {t('generator.coldChainBadge')} ({generatedShipment.package.targetTempC ?? -20}°C)
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[11px] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Code 128 & 2D DataMatrix Validated
                </span>
              </div>

              {/* Financial Rate Summary */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-950 block">
                    {t('generator.billedTotal')}
                  </span>
                  <span className="text-[10px] text-blue-800">
                    Includes freight base ({formatCurrency(generatedShipment.rates.baseCost)}), fuel surcharge ({formatCurrency(generatedShipment.rates.fuelSurcharge)}), and value indemnity
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-lg font-black text-blue-900">
                    {formatCurrency(generatedShipment.rates.totalCost)}
                  </span>
                </div>
              </div>

              {/* Print Advisory Note */}
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  {t('generator.printSpecsNotice')}
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{t('generator.thermalStockReady')}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintConfirmModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  {t('generator.cancel')}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmPrint}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t('generator.confirmAndPrint')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
