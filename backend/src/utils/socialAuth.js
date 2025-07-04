const axios = require('axios');

/**
 * Verify Google OAuth token
 */
const verifyGoogleToken = async (token) => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`
    );
    return {
      socialId: response.data.id,
      email: response.data.email,
      name: response.data.name,
      profilePicture: response.data.picture,
      verified: response.data.verified_email
    };
  } catch (error) {
    throw new Error('Invalid Google token');
  }
};

/**
 * Verify Facebook OAuth token
 */
const verifyFacebookToken = async (token) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${token}`
    );
    return {
      socialId: response.data.id,
      email: response.data.email,
      name: response.data.name,
      profilePicture: response.data.picture?.data?.url,
      verified: true
    };
  } catch (error) {
    throw new Error('Invalid Facebook token');
  }
};

module.exports = {
  verifyGoogleToken,
  verifyFacebookToken
};