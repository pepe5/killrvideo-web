import path from 'path';
import { load } from 'grpc';
import { getClientAsync } from './discovery';

// Path to .proto definitions (copied to output as part of the build)
const PROTO_BASE_PATH = path.resolve(__dirname, '..', 'resources/protos');
const PROTO_PATH = `search/search_service.proto`;

// Load the protobuf files
const proto = load({ file: PROTO_PATH, root: PROTO_BASE_PATH }, 'proto', { convertFieldsToCamelCase: true });

// Export the service constructor
export default proto.killrvideo.search.SearchService;