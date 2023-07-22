import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ABI from './ABI.json';
import Notification from './Notification';
import { FaBell, FaEthereum } from 'react-icons/fa';
import { TbCherryFilled } from 'react-icons/tb';
import { BiRefresh } from 'react-icons/bi';

function App() {

  const [connected, setConnected] = useState(false);
  const [contract, setContract] = useState(null);
  const [signer, setSigner] = useState(null);
  const [slots, setSlots] = useState({ slot1: 2, slot2: 2, slot3: 2 });
  const [spinning, setSpinning] = useState(false);
  const [staking, setStaking] = useState(false);
  const [stakeAmount, setStakeAmount] = useState(0);
  const [userStakedAmount, setUserStakedAmount] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [notification, setNotification] = useState({ message: '', show: false });

  const slotNames = [<TbCherryFilled />, <FaBell />, <FaEthereum />];

  const contractAddress = "0xf159Ca02471E2bB27985C3AB97aBDedCDFCA8c08";

  useEffect(() => {
    console.log("useEffect triggered", { contract, signer, connected });

    if (connected && signer) {
      const fetchStakedAmount = async () => {
        const stakerAddress = await signer.getAddress();
        console.log("Fetching staked amount for:", stakerAddress);
        const stakerInfo = await contract.stakers(stakerAddress);
        console.log("Raw staked amount from contract:", stakerInfo.amount.toString());
        setUserStakedAmount(ethers.utils.formatEther(stakerInfo.amount));
        console.log("Formatted staked amount:", ethers.utils.formatEther(stakerInfo.amount));
      };

      fetchStakedAmount();
    }

    if (connected && signer) {
      const fetchPendingEarnings = async () => {
        const earnings = await calculatePendingEarnings();
        setPendingEarnings(earnings);
      };

      fetchPendingEarnings();
    }

    if (contract) {
      const handlePlayedEvent = async (player, slot1, slot2, slot3) => {
        console.log("Played event triggered", player, slot1, slot2, slot3);
        const signerAddress = await signer.getAddress();
        if (player === signerAddress) {
          setSlots({ slot1, slot2, slot3 });
          setSpinning(false);
        }
      };

      contract.on("Played", handlePlayedEvent);
      return () => {
        contract.off("Played", handlePlayedEvent);
      };
    }

  }, [contract, signer, userStakedAmount]);


  const connect = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const _signer = provider.getSigner();
      setSigner(_signer);
      await _signer.signMessage("Hello World");
      const _contract = new ethers.Contract(contractAddress, ABI, _signer);
      setContract(_contract);
      setConnected(true);
      showNotification('connected');
    } catch (error) {
      showNotification('Error connecting wallet...');
      console.log(error);
    }
  };

  const play = async () => {
    try {
      const tx = await contract.play({
        value: ethers.utils.parseEther("0.001")
      });
      setSpinning(true);
      await tx.wait();
      showNotification('transaction complete');
    } catch (error) {
      showNotification('Error...');
      if (error.data && error.data.message) {
        console.error("Revert reason:", error.data.message);
      } else {
        console.error(error);
      }
      setSpinning(false);
    }
  };

  const stake = async () => {
    try {
      const tx = await contract.stake({
        value: ethers.utils.parseEther(stakeAmount)
      });
      await tx.wait()
    } catch (error) {
      console.log(error)
    }
  }

  const showNotification = (message) => {
    setNotification({ message, show: true });
  };

  const handleStakeAmountChange = (e) => {
    setStakeAmount(e.target.value);
  };

  const withdraw = async (amount) => {
    try {
      const tx = await contract.withdraw(ethers.utils.parseEther(amount));
      await tx.wait();
      showNotification('Withdrawal complete');
    } catch (error) {
      showNotification('Error withdrawing...');
      console.log(error);
    }
  }

  const calculatePendingEarnings = async () => {
    const stakerAddress = await signer.getAddress();
    const stakerInfo = await contract.stakers(stakerAddress);
    const contractTotalEarnings = await contract.totalEarnings();

    const pendingEarnings = (contractTotalEarnings.sub(stakerInfo.lastUpdated))
      .mul(stakerInfo.amount)
      .div(await contract.totalStaked());

    return ethers.utils.formatEther(pendingEarnings);
  };

  function openStaking() {
    setStaking(true)
  }

  function closeStaking() {
    setStaking(false)
  }

  return (
    <div className="App">

      {!connected && (
        <button className='connect' onClick={connect}>connect</button>
      )}

      {connected && (
        <div className='slot-machine'>
          <div className='slots'>
            <div className='slot'>
              {spinning ? <BiRefresh className="spinning" /> : slotNames[slots.slot1]}
            </div>
            <div className='slot'>
              {spinning ? <BiRefresh className="spinning" /> : slotNames[slots.slot2]}
            </div>
            <div className='slot'>
              {spinning ? <BiRefresh className="spinning" /> : slotNames[slots.slot3]}
            </div>


          </div>
          <button className='play' onClick={play}>SPIN</button>

        </div>
      )}

      {connected && (
        <div>
          {!staking && (
            <button className='openStake' onClick={openStaking}>STAKE</button>
          )}
          {staking && (
            <div className='staking'>
              <div className='staking-modal'>
              <div className='balances'>
              <p>STAKED: {userStakedAmount} ETH</p>
              <p>REWARDS: {pendingEarnings} ETH</p>
              </div>
              
              <input className='inputs' value={stakeAmount} onChange={handleStakeAmountChange} placeholder="Amount to stake" />
              <button onClick={stake}>STAKE</button>
              <button onClick={() => withdraw(userStakedAmount)}>WITHDRAW</button>
              <button onClick={closeStaking}>CLOSE</button>
              </div>
            </div>
          )}
        </div>

      )}

      <Notification
        message={notification.message}
        show={notification.show}
        setShow={(show) => setNotification({ ...notification, show })} />
    </div>
  );
}

export default App;
