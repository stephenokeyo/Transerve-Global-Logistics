/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LogisticsHero } from './components/LogisticsHero';
import { PackageTracker } from './components/PackageTracker';
import { ShippingLabelGenerator } from './components/ShippingLabelGenerator';
import { ShipmentManifest } from './components/ShipmentManifest';
import { RateCalculatorModal } from './components/RateCalculatorModal';
import { UserManagementConsole } from './components/UserManagementConsole';
import { CustomerOrderHistory } from './components/CustomerOrderHistory';
import { getShipments, findShipmentByQuery } from './data/mockShipments';
import { getCurrentUser, setCurrentUser, addAuditLog } from './data/mockUsers';
import { Shipment } from './types/shipping';
import { User, UserRole } from './types/user';
import { useI18n } from './i18n/I18nContext';
import { Shield, Truck, User as UserIcon, CheckCircle2, ArrowRight } from 'lucide-react';

export default function App() {
  const { t } = useI18n();
  const [currentUser, setUserState] = useState<User>(getCurrentUser());
  const [activeTab, setActiveTab] = useState<'tracker' | 'generator' | 'manifest' | 'admin' | 'customer_orders'>('tracker');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null);
  const [isRateCalcOpen, setIsRateCalcOpen] = useState(false);
  const [roleToast, setRoleToast] = useState<string | null>(null);

  // Initialize shipments
  useEffect(() => {
    const list = getShipments();
    setShipments(list);
    if (list.length > 0) {
      setCurrentShipment(list[0]);
    }
  }, []);

  const handleUserChanged = (newUser: User) => {
    setUserState(newUser);
    setCurrentUser(newUser);

    // Show toast explaining active role capabilities
    let desc = '';
    if (newUser.role === 'admin') {
      desc = t('toast.switchedAdmin');
      setActiveTab('admin');
    } else if (newUser.role === 'shipper') {
      desc = t('toast.switchedShipper');
      setActiveTab('generator');
    } else {
      desc = t('toast.switchedCustomer');
      setActiveTab('customer_orders');
    }

    setRoleToast(desc);
    setTimeout(() => setRoleToast(null), 4000);
  };


  const handleSelectShipment = (shipment: Shipment) => {
    setCurrentShipment(shipment);
    setActiveTab('tracker');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickTrack = (query: string) => {
    const found = findShipmentByQuery(query);
    if (found) {
      setCurrentShipment(found);
      setActiveTab('tracker');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveTab('tracker');
    }
  };

  const handleShipmentCreated = (newShipment: Shipment) => {
    const updated = getShipments();
    setShipments(updated);
    setCurrentShipment(newShipment);
    setActiveTab('tracker');

    // Audit log
    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action: 'SHIPMENT_CREATED',
      details: `Programmatically created ${newShipment.carrier.toUpperCase()} shipment ${newShipment.trackingNumber}`,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenRateCalculator={() => setIsRateCalcOpen(true)}
        currentUser={currentUser}
        onUserChanged={handleUserChanged}
      />

      {/* Role Switch Feedback Toast */}
      {roleToast && (
        <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2 text-xs flex items-center justify-between transition-all">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{roleToast}</span>
            </div>
            <button
              onClick={() => setRoleToast(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* CUSTOMER TAB: Customer Order History & Inbound Shipments */}
        {activeTab === 'customer_orders' && (
          <div className="space-y-6">
            <CustomerOrderHistory
              currentUser={currentUser}
              allShipments={shipments}
              onTrackShipment={handleSelectShipment}
            />
          </div>
        )}

        {/* TRACKER TAB: Live Tracking & Customer Experience */}
        {activeTab === 'tracker' && currentShipment && (
          <div className="space-y-10">
            {/* Hero Banner with Quick Track */}
            <LogisticsHero
              onQuickTrack={handleQuickTrack}
              onOpenShipmentGenerator={() => {
                if (currentUser.role === 'customer') {
                  setRoleToast('Note: Commercial label generation requires Shipper or Administrator role. Switch role in the top right.');
                  setTimeout(() => setRoleToast(null), 3500);
                } else {
                  setActiveTab('generator');
                }
              }}
            />

            {/* Live Package Tracker */}
            <div id="live-tracker-section">
              <PackageTracker
                currentShipment={currentShipment}
                onSelectShipment={handleSelectShipment}
                allShipments={shipments}
              />
            </div>
          </div>
        )}

        {/* SHIPPER/ADMIN TAB: Automated Multi-Carrier Shipping Label Studio */}
        {activeTab === 'generator' && (
          <div className="space-y-6">
            {currentUser.role === 'customer' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-3">
                <Shield className="w-8 h-8 text-amber-600 mx-auto" />
                <h3 className="font-bold text-slate-900 text-base">{t('access.shipperRequired')}</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  {t('access.shipperRequiredDesc', { name: currentUser.name })}
                </p>
                <button
                  onClick={() => setActiveTab('customer_orders')}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  {t('access.returnOrders')}
                </button>
              </div>
            ) : (
              <ShippingLabelGenerator
                onShipmentCreated={handleShipmentCreated}
              />
            )}
          </div>
        )}

        {/* SHIPPER/ADMIN TAB: Central Operations & Shipment Manifest */}
        {activeTab === 'manifest' && (
          <div className="space-y-6">
            {currentUser.role === 'customer' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-3">
                <Shield className="w-8 h-8 text-amber-600 mx-auto" />
                <h3 className="font-bold text-slate-900 text-base">{t('access.shipperRequired')}</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  {t('access.manifestShipperRequiredDesc')}
                </p>
                <button
                  onClick={() => setActiveTab('customer_orders')}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  {t('access.returnOrders')}
                </button>
              </div>
            ) : (
              <ShipmentManifest
                shipments={shipments}
                onSelectShipment={handleSelectShipment}
                currentUser={currentUser}
              />
            )}
          </div>
        )}

        {/* ADMIN TAB: Full Control User Management & Governance */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {currentUser.role !== 'admin' ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
                <Shield className="w-8 h-8 text-rose-600 mx-auto" />
                <h3 className="font-bold text-slate-900 text-base">{t('access.adminRequired')}</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  {t('access.adminRequiredDesc')}
                </p>
                <button
                  onClick={() => setActiveTab(currentUser.role === 'customer' ? 'customer_orders' : 'tracker')}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  {t('access.returnDashboard')}
                </button>
              </div>
            ) : (
              <UserManagementConsole
                currentUser={currentUser}
                onUserRoleUpdated={() => setUserState(getCurrentUser())}
              />
            )}
          </div>
        )}
      </main>

      {/* Rate Calculator Modal */}
      <RateCalculatorModal
        isOpen={isRateCalcOpen}
        onClose={() => setIsRateCalcOpen(false)}
      />

      {/* Institutional Global Network Footer */}
      <Footer />
    </div>
  );
}
