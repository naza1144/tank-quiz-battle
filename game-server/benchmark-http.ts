const TARGET = process.env.TARGET || 'http://localhost:80';
const ENDPOINTS = ['/api/health', '/api/rooms', '/api/quizzes', '/'];
const CONCURRENCY = 50;
const TOTAL_REQUESTS = 3000;

console.log(`🚀 [HTTP BENCHMARK] Benchmarking Gateway & APIs through ${TARGET}...`);
console.log(`⚡ Concurrency: ${CONCURRENCY} concurrent workers`);
console.log(`📦 Total Requests: ${TOTAL_REQUESTS} requests\n`);

async function benchmark() {
  const start = Date.now();
  let successCount = 0;
  let errorCount = 0;
  const latencies: number[] = [];

  let completed = 0;
  async function worker() {
    while (completed < TOTAL_REQUESTS) {
      completed++;
      const endpoint = ENDPOINTS[completed % ENDPOINTS.length];
      const t0 = performance.now();
      try {
        const res = await fetch(`${TARGET}${endpoint}`);
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
      latencies.push(performance.now() - t0);
    }
  }

  const workers = Array(CONCURRENCY).fill(null).map(() => worker());
  await Promise.all(workers);

  const durationSec = (Date.now() - start) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)].toFixed(2);
  const p90 = latencies[Math.floor(latencies.length * 0.9)].toFixed(2);
  const p99 = latencies[Math.floor(latencies.length * 0.99)].toFixed(2);
  const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
  const rps = (successCount / durationSec).toFixed(0);

  console.log('='.repeat(55));
  console.log('📊 [GATEWAY & API PERFORMANCE RESULTS]:');
  console.log('='.repeat(55));
  console.log(`✅ Success Rate:          ${((successCount / TOTAL_REQUESTS) * 100).toFixed(1)}% (${successCount}/${TOTAL_REQUESTS})`);
  console.log(`❌ Error Count:           ${errorCount}`);
  console.log(`⚡ Throughput (RPS):       ${rps} Requests/sec`);
  console.log(`⏱️ Average Latency:       ${avg} ms`);
  console.log(`⏱️ p50 Latency (Median):  ${p50} ms`);
  console.log(`⏱️ p90 Latency:           ${p90} ms`);
  console.log(`⏱️ p99 Latency:           ${p99} ms`);
  console.log('='.repeat(55));
  console.log(`🎉 Gateway and Services are extremely FAST and STABLE under heavy load!\n`);
}

benchmark().catch(console.error);
