// src/utils/mobileSession.js - Updated version to handle large session data

export const storeMobileSession = async (sessionData) => {
  try {
    console.log('💾 === STORING MOBILE SESSION ===');
    
    // Create a minimal session object for mobile storage
    const mobileSession = {
      user: {
        id: sessionData.id,
        name: sessionData.name,
        email: sessionData.email,
        emailVerified: sessionData.emailVerified,
        avatar: sessionData.avatar,
        subscriptionTier: sessionData.subscriptionTier,
        subscriptionStatus: sessionData.subscriptionStatus,
        effectiveTier: sessionData.effectiveTier,
        isAdmin: sessionData.isAdmin,
        // Store only essential subscription data
        subscription: {
          status: sessionData.subscription?.status,
          tier: sessionData.subscription?.tier,
          startDate: sessionData.subscription?.startDate
        },
        // Store only essential usage data
        usage: {
          totalInventoryItems: sessionData.usage?.totalInventoryItems || 0,
          totalPersonalRecipes: sessionData.usage?.totalPersonalRecipes || 0,
          totalSavedRecipes: sessionData.usage?.totalSavedRecipes || 0
        }
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    const serializedSession = JSON.stringify(mobileSession);
    console.log(`📦 Mobile session length: ${serializedSession.length} characters`);
    
    // Store in chunks if needed (Capacitor has storage limits)
    if (serializedSession.length > 1000) {
      console.log('📦 Large session detected, using chunked storage');
      const chunkSize = 800;
      const chunks = [];
      
      for (let i = 0; i < serializedSession.length; i += chunkSize) {
        chunks.push(serializedSession.slice(i, i + chunkSize));
      }
      
      // Store chunks
      for (let i = 0; i < chunks.length; i++) {
        await Preferences.set({
          key: `mobile_session_chunk_${i}`,
          value: chunks[i]
        });
      }
      
      // Store metadata
      await Preferences.set({
        key: 'mobile_session_meta',
        value: JSON.stringify({
          chunks: chunks.length,
          totalLength: serializedSession.length,
          expires: mobileSession.expires
        })
      });
      
      console.log(`📦 Stored session in ${chunks.length} chunks`);
    } else {
      // Store normally if small enough
      await Preferences.set({
        key: 'mobile_session',
        value: serializedSession
      });
      
      await Preferences.set({
        key: 'mobile_session_expiry',
        value: mobileSession.expires
      });
    }

    console.log('✅ Mobile session stored successfully');
    return true;
  } catch (error) {
    console.error('❌ Error storing mobile session:', error);
    return false;
  }
};

export const getMobileSession = async () => {
  try {
    console.log('📖 === RETRIEVING MOBILE SESSION ===');
    
    // Check if we have chunked data
    const metaResult = await Preferences.get({ key: 'mobile_session_meta' });
    
    if (metaResult.value) {
      // Retrieve chunked session
      const meta = JSON.parse(metaResult.value);
      console.log(`📦 Retrieving chunked session: ${meta.chunks} chunks`);
      
      let fullSession = '';
      for (let i = 0; i < meta.chunks; i++) {
        const chunkResult = await Preferences.get({ 
          key: `mobile_session_chunk_${i}` 
        });
        if (chunkResult.value) {
          fullSession += chunkResult.value;
        } else {
          console.error(`❌ Missing chunk ${i}`);
          return null;
        }
      }
      
      if (fullSession.length !== meta.totalLength) {
        console.error('❌ Chunked session length mismatch');
        return null;
      }
      
      const session = JSON.parse(fullSession);
      
      // Check expiry
      if (new Date() > new Date(meta.expires)) {
        console.log('⏰ Chunked session expired');
        await clearMobileSession();
        return null;
      }
      
      return session;
    }
    
    // Try regular storage
    const result = await Preferences.get({ key: 'mobile_session' });
    const expiryResult = await Preferences.get({ key: 'mobile_session_expiry' });
    
    if (!result.value || !expiryResult.value) {
      console.log('❌ No mobile session found');
      return null;
    }
    
    // Check expiry
    if (new Date() > new Date(expiryResult.value)) {
      console.log('⏰ Mobile session expired');
      await clearMobileSession();
      return null;
    }
    
    const session = JSON.parse(result.value);
    console.log('✅ Valid mobile session retrieved');
    return session;
    
  } catch (error) {
    console.error('❌ Error retrieving mobile session:', error);
    return null;
  }
};

export const clearMobileSession = async () => {
  try {
    // Clear chunked data
    const metaResult = await Preferences.get({ key: 'mobile_session_meta' });
    if (metaResult.value) {
      const meta = JSON.parse(metaResult.value);
      for (let i = 0; i < meta.chunks; i++) {
        await Preferences.remove({ key: `mobile_session_chunk_${i}` });
      }
      await Preferences.remove({ key: 'mobile_session_meta' });
    }
    
    // Clear regular data
    await Preferences.remove({ key: 'mobile_session' });
    await Preferences.remove({ key: 'mobile_session_expiry' });
    
    console.log('🗑️ Mobile session cleared');
  } catch (error) {
    console.error('❌ Error clearing mobile session:', error);
  }
};